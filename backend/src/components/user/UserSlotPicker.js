import express from 'express';
import { requireId, requireText, rpc } from '../../http.js';
const router = express.Router();

router.get('/:vehicleType', async (req, res) => {
  const type = requireText(req.params.vehicleType, 'Vehicle type');
  const { data, error } = await req.db.from('parking_slots')
    .select('id, zone_id, slot_name, status, vehicle_id, parking_zones!inner(vehicle_type)')
    .eq('parking_zones.vehicle_type', type).order('slot_name');
  if (error) throw error;
  res.json(data || []);
});

router.post('/save', async (req, res) => {
  await rpc(req.db, 'reserve_parking_slot', {
    p_user_id: req.user.id,
    p_vehicle_id: requireId(req.body.vehicleId),
    p_slot_id: requireId(req.body.selectedSlotId),
  });
  res.json({ success: true });
});
export default router;
