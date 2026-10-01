import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/notifications/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data && data.length > 0 ? data : [
            { id: 1, title: 'Khuyến mãi đặc biệt', message: 'Giảm 20% thẻ tháng khi gia hạn trong hôm nay!', is_read: false },
            { id: 2, title: 'Nhắc nhở gia hạn', message: 'Thẻ tháng Ô tô của bạn sẽ hết hạn sau 3 ngày nữa.', is_read: true }
        ]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/vehicles/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*, parking_slots(slot_name)')
            .eq('user_id', req.params.userId);

        if (error) throw error;

        let activeVehicleIds = [];
        if (data && data.length > 0) {
            const vIds = data.map(v => v.id);
            const { data: sessions, error: sessionErr } = await supabase.from('parking_sessions').select('vehicle_id').in('vehicle_id', vIds).eq('status', 'active');
            if (sessionErr) throw sessionErr;
            if (sessions) {
                activeVehicleIds = sessions.map(s => s.vehicle_id);
            }
        }
        
        res.json({ vehicles: data || [], activeVehicleIds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/vehicles/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('vehicles').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
