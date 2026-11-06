import express from 'express';
import { requireId, requireText } from '../../http.js';
import { runSql, sqlVal } from '../../nativeSql.js';
const router = express.Router();

// Copy-pasteable Supabase SQL Editor query:
// SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, z.id, z.zone_name, z.vehicle_type, z.drainage_status, z.sensor_status, z.cctv_coverage, z.lighting_status FROM public.parking_slots s INNER JOIN public.parking_zones z ON z.id = s.zone_id WHERE z.vehicle_type = 'Ô tô' ORDER BY s.slot_name;
router.get('/:vehicleType', async (req, res) => {
  const type = requireText(req.params.vehicleType, 'Vehicle type');

  const { data, error } = await runSql(
    req.db,
    `SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, z.id, z.zone_name, z.vehicle_type, z.drainage_status, z.sensor_status, z.cctv_coverage, z.lighting_status
     FROM public.parking_slots s
     INNER JOIN public.parking_zones z ON z.id = s.zone_id
     WHERE z.vehicle_type = ${sqlVal(type)}
     ORDER BY s.slot_name;`
  );

  if (error) {
    const fallback = await runSql(
      req.db,
      `SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, z.vehicle_type
       FROM public.parking_slots s
       INNER JOIN public.parking_zones z ON z.id = s.zone_id
       WHERE z.vehicle_type = ${sqlVal(type)}
       ORDER BY s.slot_name;`
    );
    if (fallback.error) throw fallback.error;
    return res.json(fallback.data || []);
  }

  res.json(data || []);
});

// Copy-pasteable Supabase SQL Editor query:
// SELECT public.reserve_parking_slot('<USER_UUID>', '<VEHICLE_UUID>', '<SLOT_UUID>');
router.post('/save', async (req, res) => {
  const vehicleId = requireId(req.body.vehicleId);
  const selectedSlotId = requireId(req.body.selectedSlotId);
  await runSql(
    req.db,
    `SELECT public.reserve_parking_slot(${sqlVal(req.user.id)}, ${sqlVal(vehicleId)}, ${sqlVal(selectedSlotId)});`
  );
  res.json({ success: true });
});

export default router;
