import express from 'express';
import { HttpError, requireId, requireText, rpc } from '../../http.js';
const router = express.Router();

router.get('/zones', async (req, res) => {
  const { data, error } = await req.db.from('parking_zones')
    .select('id, zone_name, vehicle_type, total_capacity, current_occupancy').order('created_at');
  if (error) throw error;
  res.json(data || []);
});
router.get('/slots', async (req, res) => {
  const { data, error } = await req.db.from('parking_slots').select('id, zone_id, slot_name, status, vehicle_id, vehicles(plate)');
  if (error) throw error;
  res.json(data || []);
});
router.post('/zones', async (req, res) => {
  const name = requireText(req.body.zone_name, 'Zone name', 80);
  const type = requireText(req.body.vehicle_type, 'Vehicle type');
  const capacity = Number(req.body.total_capacity);
  if (!['Xe máy', 'Ô tô'].includes(type) || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    throw new HttpError(400, 'Select a vehicle type and a capacity between 1 and 1000.');
  }
  await rpc(req.db, 'create_parking_zone', { p_name: name, p_type: type, p_capacity: capacity });
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
