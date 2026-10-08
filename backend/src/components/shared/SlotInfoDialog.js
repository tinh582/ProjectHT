import express from 'express';

const router = express.Router();

router.get('/:vehicleId', async (req, res) => {
    const { vehicleId } = req.params;
    const { data: vehicle, error: vError } = await req.db.from('vehicles').select('*').eq('id', vehicleId).single();
    if (vError) throw vError;

    const { data: profile, error: pError } = await req.db.from('profiles').select('id, name, email').eq('id', vehicle.user_id).single();
    if (pError) throw pError;

    res.json({ vehicle, profile });
});

export default router;
