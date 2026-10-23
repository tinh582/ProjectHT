import express from 'express';
import { HttpError, requireId, requireText, rpc } from '../../http.js';
const router = express.Router();

router.get('/zones', async (req, res) => {
  let data = null;
  let error = null;
  try {
    const resDb = await req.db.from('parking_zones')
      .select('id, zone_name, vehicle_type, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status')
      .order('created_at');
    data = resDb.data;
    error = resDb.error;
    if (error) throw error;
  } catch (err) {
    const fallback = await req.db.from('parking_zones')
      .select('id, zone_name, vehicle_type, total_capacity, current_occupancy')
      .order('created_at');
    data = fallback.data;
  }
  res.json(data || []);
});

router.get('/slots', async (req, res) => {
  const { data, error } = await req.db.from('parking_slots').select('id, zone_id, slot_name, status, vehicle_id, vehicles(plate, type)');
  if (error) throw error;
  res.json(data || []);
});

router.post('/zones', async (req, res) => {
  const name = requireText(req.body.zone_name, 'Zone name', 80);
  const type = requireText(req.body.vehicle_type, 'Vehicle type');
  const capacity = Number(req.body.total_capacity);
  const drainage_status = req.body.drainage_status || 'Tốt';
  const sensor_status = req.body.sensor_status || 'Hoạt động';
  const cctv_coverage = req.body.cctv_coverage || 'Góc rộng 24/7';
  const lighting_status = req.body.lighting_status || 'Đèn LED cảm ứng';

  if (!['Xe máy', 'Ô tô'].includes(type) || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    throw new HttpError(400, 'Chọn loại xe và sức chứa từ 1 đến 1000.');
  }

  await rpc(req.db, 'create_parking_zone', { p_name: name, p_type: type, p_capacity: capacity });

  try {
    await req.db.from('parking_zones')
      .update({ drainage_status, sensor_status, cctv_coverage, lighting_status })
      .eq('zone_name', name);
  } catch (e) {}

  res.json({ success: true });
});

router.delete('/zones/:id', async (req, res) => {
  await rpc(req.db, 'delete_parking_zone', { p_zone_id: requireId(req.params.id) });
  res.json({ success: true });
});

router.post('/zones/:id/slots', async (req, res) => {
  await rpc(req.db, 'initialize_parking_slots', { p_zone_id: requireId(req.params.id) });
  res.json({ success: true });
});

export default router;