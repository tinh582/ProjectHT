import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, profiles(name, email)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { error } = await supabase.from('transactions').update({ status }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
