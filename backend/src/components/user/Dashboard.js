import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId, rpc } from '../../http.js';

const router = express.Router();

router.get('/notifications/:userId', async (req, res) => {
    requireSelf(req, req.params.userId);
    const { data, error } = await req.db.from('notifications').select('id, title, message, is_read, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data || []);
});

router.get('/vehicles/:userId', async (req, res) => {
    requireSelf(req, req.params.userId);
    const { data, error } = await req.db
        .from('vehicles')
        .select('*, parking_slots(slot_name)')
        .eq('user_id', req.params.userId);

    if (error) throw error;

    let activeVehicleIds = [];
    if (data && data.length > 0) {
        const vIds = data.map(v => v.id);
        const { data: sessions, error: sessionErr } = await req.db.from('parking_sessions').select('vehicle_id').in('vehicle_id', vIds).eq('status', 'active');
        if (sessionErr) throw sessionErr;
        if (sessions) {
            activeVehicleIds = sessions.map(s => s.vehicle_id);
        }
    }

    res.json({ vehicles: data || [], activeVehicleIds });
});

router.delete('/vehicles/:id', async (req, res) => {
    await rpc(req.db, 'edit_parking_vehicle', {
        p_user_id: req.user.id, p_vehicle_id: requireId(req.params.id), p_fields: {}, p_delete: true,
    });
    res.json({ success: true });
});

export default router;
