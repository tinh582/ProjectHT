import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { data: vehicle, error: vError } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
        if (vError) throw vError;
        
        const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', vehicle.user_id).single();
        if (pError) throw pError;

        res.json({ vehicle, profile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
