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
    const sessionsByVehicle = {};

    if (data && data.length > 0) {
        const vIds = data.map(v => v.id);
        const { data: sessions, error: sessionErr } = await req.db
            .from('parking_sessions')
            .select('id, vehicle_id, entry_time, exit_time, status, created_at')
            .in('vehicle_id', vIds)
            .order('entry_time', { ascending: false });

        if (sessionErr) throw sessionErr;

        if (sessions) {
            for (const s of sessions) {
                if (s.status === 'active' && !activeVehicleIds.includes(s.vehicle_id)) {
                    activeVehicleIds.push(s.vehicle_id);
                }
                if (!sessionsByVehicle[s.vehicle_id]) {
                    sessionsByVehicle[s.vehicle_id] = [];
                }
                sessionsByVehicle[s.vehicle_id].push(s);
            }
        }
    }

    const responsePayload = { vehicles: data || [], activeVehicleIds };
    if (req.query.withSessions === 'true') {
        responsePayload.sessionsByVehicle = sessionsByVehicle;
    }

    res.json(responsePayload);
});

router.get('/sessions/:userId', async (req, res) => {
    requireSelf(req, req.params.userId);
    const { data: userVehicles, error: vErr } = await req.db
        .from('vehicles')
        .select('id, plate, brand, model, type, parking_slots(slot_name)')
        .eq('user_id', req.params.userId);

    if (vErr) throw vErr;
    if (!userVehicles || userVehicles.length === 0) {
        return res.json([]);
    }

    const vMap = new Map(userVehicles.map(v => [v.id, v]));
    const vIds = userVehicles.map(v => v.id);

    const { data: sessions, error: sErr } = await req.db
        .from('parking_sessions')
        .select('id, vehicle_id, entry_time, exit_time, status, created_at')
        .in('vehicle_id', vIds)
        .order('entry_time', { ascending: false })
        .limit(100);

    if (sErr) throw sErr;

    const enriched = (sessions || []).map(s => ({
        ...s,
        vehicle: vMap.get(s.vehicle_id) || null
    }));

    res.json(enriched);
});

router.delete('/vehicles/:id', async (req, res) => {
    await rpc(req.db, 'edit_parking_vehicle', {
        p_user_id: req.user.id, p_vehicle_id: requireId(req.params.id), p_fields: {}, p_delete: true,
    });
    res.json({ success: true });
});

export default router;
