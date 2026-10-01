import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { vehicle } = req.body;
        const { error } = await supabase.from('vehicles').insert([vehicle]);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { vehicle } = req.body;
        const { error } = await supabase.from('vehicles').update(vehicle).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
