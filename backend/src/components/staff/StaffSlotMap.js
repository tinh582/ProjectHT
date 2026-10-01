import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { data: zData, error: zError } = await supabase.from('parking_zones').select('*').order('created_at', { ascending: true });
        if (zError) throw zError;
        
        const { data: sData, error: sError } = await supabase.from('parking_slots').select('*, vehicles(plate)');
        if (sError) throw sError;
        
        res.json({ zones: zData, slots: sData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
