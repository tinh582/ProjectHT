import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('parking_sessions').select('*, vehicles(id, user_id, type, plate, brand, model)').eq('status', 'active');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/open', async (req, res) => {
    try {
        const { session } = req.body;
        const { error } = await supabase.from('parking_sessions').update({ status: 'completed', exit_time: new Date().toISOString() }).eq('id', req.params.id);
        
        if (error) throw error;
        
        if (session.vehicles?.type) {
            const { data: zones } = await supabase.from('parking_zones').select('*').eq('vehicle_type', session.vehicles.type).order('current_occupancy', { ascending: true });
            const targetZone = zones && zones.length > 0 ? zones[0] : null;
            if (targetZone) {
                await supabase.from('parking_zones').update({ current_occupancy: Math.max(0, targetZone.current_occupancy - 1) }).eq('id', targetZone.id);
            }
        }
        
        if (session.vehicles?.user_id) {
            await supabase.from('notifications').insert([{
                user_id: session.vehicles.user_id,
                title: 'Xe đã ra khỏi bãi (Mở thủ công)',
                message: `Xe ${session.vehicles.brand} ${session.vehicles.model} (${session.vehicles.plate}) đã được mở Barie thủ công lúc ${new Date().toLocaleTimeString()}`
            }]);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
