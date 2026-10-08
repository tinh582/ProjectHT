import express from 'express';
import { HttpError, requireText, requireId } from '../../http.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const { data, error } = await req.db.from('pricing_configs').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
});

router.post('/', async (req, res) => {
    const plan_type = requireText(req.body.plan_type, 'Plan name');
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 0 || price > 1000000000 || req.body.price === null || req.body.price === '') {
        throw new HttpError(400, 'Invalid price.');
    }
    const { error } = await req.db.from('pricing_configs').insert([{ plan_type, price }]);
    if (error) throw error;
    res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
    const { error } = await req.db.from('pricing_configs').delete().eq('id', requireId(req.params.id));
    if (error) throw error;
    res.json({ success: true });
});

export default router;
