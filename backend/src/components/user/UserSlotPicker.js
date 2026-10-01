import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/:vehicleType', async (req, res) => {
    try {
        const { vehicleType } = req.params;
        const { data: zones } = await supabase.from('parking_zones').select('id').eq('vehicle_type', vehicleType);
        if (!zones || zones.length === 0) {
            return res.json([]);
        }
        
        const zoneIds = zones.map(z => z.id);
        const { data: allSlots } = await supabase.from('parking_slots').select('*').in('zone_id', zoneIds);
        
        res.json(allSlots || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/save', async (req, res) => {
    try {
        const { currentSlotId, selectedSlotId, vehicleId } = req.body;
        
        if (currentSlotId) {
            await supabase.from('parking_slots').update({ status: 'empty', vehicle_id: null }).eq('id', currentSlotId);
        }

        const { error } = await supabase.from('parking_slots').update({ status: 'rented', vehicle_id: vehicleId }).eq('id', selectedSlotId);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
