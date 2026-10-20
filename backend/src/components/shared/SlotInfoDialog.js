import express from 'express';

const router = express.Router();

router.get('/:vehicleId', async (req, res) => {
    const { vehicleId } = req.params;
    const { data: vehicle, error: vError } = await req.db.from('vehicles').select('*').eq('id', vehicleId).single();
    if (vError) throw vError;

    const { data: profile, error: pError } = await req.db.from('profiles').select('id, name, email').eq('id', vehicle.user_id).single();
    if (pError) throw pError;

    const { data: sessions } = await req.db.from('parking_sessions')
        .select('id, entry_time, exit_time, status')
        .eq('vehicle_id', vehicleId)
        .order('entry_time', { ascending: false })
        .limit(10);

    const activeSession = sessions?.find(s => s.status === 'active') || null;

    res.json({ vehicle, profile, activeSession, sessions: sessions || [] });
});

export default router;
