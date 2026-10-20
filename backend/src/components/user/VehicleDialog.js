import express from 'express';
import { HttpError, requireId, requireText, rpc } from '../../http.js';
import { extractLicensePlate } from '../../roboflow.js';
import { hasActiveSubscription } from '../../subscription.js';

const router = express.Router();

function vehicleFields(input = {}, isCreate = false) {
  const type = requireText(input.type, 'Vehicle type');
  if (!['Xe máy', 'Ô tô'].includes(type)) throw new HttpError(400, 'Invalid vehicle type.');
  const months = Number(input.months);
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new HttpError(400, 'Months must be between 1 and 120.');
  const fields = {
    type, months,
    brand: requireText(input.brand, 'Brand'), model: requireText(input.model, 'Model'),
    color: requireText(input.color, 'Color'), plate: requireText(input.plate, 'Plate', 30).toUpperCase(),
  };

  if (isCreate && !input.image) {
    throw new HttpError(400, 'Ảnh phương tiện có chứa biển số xe là bắt buộc.');
  }

  if (input.image !== undefined) {
    if (typeof input.image !== 'string' || input.image.length > 2000000 || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(input.image)) {
      throw new HttpError(400, 'Use a PNG, JPEG, WebP or GIF image smaller than 1.5 MB.');
    }
    fields.image = input.image;
  }
  return fields;
}

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
  const hasSub = await hasActiveSubscription(req.db, req.user.id);
  if (!hasSub) {
    throw new HttpError(403, 'Bạn cần đăng ký và thanh toán gói cước đỗ xe trước khi đăng ký phương tiện.');
  }
  const fields = vehicleFields(req.body.vehicle, true);
  const { error } = await req.db.from('vehicles').insert({ ...fields, user_id: req.user.id });
  if (error) throw error;
  res.json({ success: true });
});

router.put('/:id', async (req, res) => {
  const hasSub = await hasActiveSubscription(req.db, req.user.id);
  if (!hasSub) {
    throw new HttpError(403, 'Gói cước đỗ xe của bạn đã hết hạn. Vui lòng thanh toán gia hạn.');
  }
  await rpc(req.db, 'edit_parking_vehicle', {
    p_user_id: req.user.id, p_vehicle_id: requireId(req.params.id), p_fields: vehicleFields(req.body.vehicle, false), p_delete: false,
  });
  res.json({ success: true });
});

export default router;
