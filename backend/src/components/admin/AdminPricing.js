import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('pricing_configs').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { plan_type, price } = req.body;
        const { error } = await supabase.from('pricing_configs').insert([{ plan_type, price }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('pricing_configs').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
