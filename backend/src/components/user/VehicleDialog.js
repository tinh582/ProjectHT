import express from 'express';
import { HttpError, requireId, requireText, rpc } from '../../http.js';
const router = express.Router();

function vehicleFields(input = {}) {
  const type = requireText(input.type, 'Vehicle type');
  if (!['Xe máy', 'Ô tô'].includes(type)) throw new HttpError(400, 'Invalid vehicle type.');
  const months = Number(input.months);
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new HttpError(400, 'Months must be between 1 and 120.');
  const fields = {
    type, months,
    brand: requireText(input.brand, 'Brand'), model: requireText(input.model, 'Model'),
    color: requireText(input.color, 'Color'), plate: requireText(input.plate, 'Plate', 30).toUpperCase(),
  };
  if (input.image !== undefined) {
    if (typeof input.image !== 'string' || input.image.length > 1500000 || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(input.image)) {
      throw new HttpError(400, 'Use a PNG, JPEG, WebP or GIF image smaller than 1 MB.');
    }
    fields.image = input.image;
  }
  return fields;
}

router.post('/', async (req, res) => {
  const { error } = await req.db.from('vehicles').insert({ ...vehicleFields(req.body.vehicle), user_id: req.user.id });
  if (error) throw error;
  res.json({ success: true });
});

router.put('/:id', async (req, res) => {
  await rpc(req.db, 'edit_parking_vehicle', {
    p_user_id: req.user.id, p_vehicle_id: requireId(req.params.id), p_fields: vehicleFields(req.body.vehicle), p_delete: false,
  });
  res.json({ success: true });
});
export default router;
