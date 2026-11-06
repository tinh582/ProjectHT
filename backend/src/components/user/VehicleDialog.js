import express from 'express';
import { HttpError, requireId, requireText } from '../../http.js';
import { extractLicensePlate } from '../../roboflow.js';
import { runSql, sqlVal, sqlValues } from '../../nativeSql.js';

const router = express.Router();

function vehicleFields(input = {}, isCreate = false) {
  const type = requireText(input.type, 'Vehicle type');
  if (!['Xe máy', 'Ô tô'].includes(type)) throw new HttpError(400, 'Invalid vehicle type.');
  const months = Number(input.months);
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new HttpError(400, 'Months must be between 1 and 120.');
  const fields = {
    type,
    months,
    brand: requireText(input.brand, 'Brand'),
    model: requireText(input.model, 'Model'),
    color: requireText(input.color, 'Color'),
    plate: requireText(input.plate, 'Plate', 30).toUpperCase()
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

// Copy-pasteable Supabase SQL Editor query:
// INSERT INTO public.vehicles (type, months, brand, model, color, plate, image, user_id) VALUES ('Ô tô', 1, 'Mercedes', 'C300', 'Đen', '30G-688.86', '<BASE64>', '<USER_UUID>') RETURNING *;
router.post('/', async (req, res) => {
  const fields = vehicleFields(req.body.vehicle, true);
  const { data: createdVehicle, error } = await runSql(
    req.db,
    `INSERT INTO public.vehicles ${sqlValues({ ...fields, user_id: req.user.id })}
     RETURNING *;`,
    { maybeSingle: true }
  );
  if (error) throw error;
  res.json({ success: true, vehicle: createdVehicle || null });
});

// Copy-pasteable Supabase SQL Editor query:
// SELECT public.edit_parking_vehicle('<USER_UUID>', '<VEHICLE_UUID>', '{"type":"Ô tô"}'::jsonb, FALSE);
router.put('/:id', async (req, res) => {
  const vehId = requireId(req.params.id);
  const fields = vehicleFields(req.body.vehicle, false);
  await runSql(
    req.db,
    `SELECT public.edit_parking_vehicle(${sqlVal(req.user.id)}, ${sqlVal(vehId)}, ${sqlVal(fields)}, FALSE);`
  );
  res.json({ success: true });
});

export default router;
