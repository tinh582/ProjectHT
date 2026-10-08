import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
    const [zoneResult, slotResult] = await Promise.all([
        req.db.from('parking_zones').select('id, zone_name, vehicle_type, total_capacity, current_occupancy').order('created_at'),
        req.db.from('parking_slots').select('id, zone_id, slot_name, status, vehicle_id, vehicles(plate)'),
    ]);
    const { data: zData, error: zError } = zoneResult;
    if (zError) throw zError;

    const { data: sData, error: sError } = slotResult;
    if (sError) throw sError;

    res.json({ zones: zData, slots: sData });
});

export default router;
