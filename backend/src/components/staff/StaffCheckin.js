import express from 'express';
import { HttpError, requireText, rpc } from '../../http.js';
import { extractLicensePlate } from '../../roboflow.js';
const router = express.Router();

router.post('/extract-plate', async (req, res) => {
  const image = req.body?.image;
  if (!image) {
    throw new HttpError(400, 'Vui lòng cung cấp hình ảnh để nhận diện biển số xe.');
  }
  const result = await extractLicensePlate(image);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, plate: result.plate });
});

router.post('/', async (req, res) => {
  let plate = req.body.plateInput;

  // If image is supplied directly, extract license plate from it
  if (!plate && req.body.image) {
    const scanResult = await extractLicensePlate(req.body.image);
    if (!scanResult.success || !scanResult.plate) {
      throw new HttpError(400, scanResult.error || 'Không nhận diện được biển số từ ảnh.');
    }
    plate = scanResult.plate;
  }

  const cleanPlate = requireText(plate, 'License plate', 30).toUpperCase();
  const result = await rpc(req.db, 'transition_parking_session', { p_plate: cleanPlate, p_session_id: null });
  res.json({ logMessage: result.message, plate: cleanPlate });
});
export default router;
