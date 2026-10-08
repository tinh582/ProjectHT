import express from 'express';
import { HttpError, pageRange, requireId } from '../../http.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { page, pageSize, from, to } = pageRange(req.query);
  const { data, count, error } = await req.db.from('transactions')
    .select('id, plan_name, amount, status, created_at, profiles(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id').range(from, to);
  if (error) throw error;
  res.json({ items: data || [], total: count, page, pageSize });
});
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['completed', 'refunded'].includes(status)) throw new HttpError(400, 'Invalid status.');
  const previousStatus = status === 'completed' ? 'pending' : 'completed';
  const changes = status === 'completed' ? { status, confirmed_at: new Date().toISOString() } : { status };
  const { data, error } = await req.db.from('transactions').update(changes)
    .eq('id', requireId(req.params.id)).eq('status', previousStatus).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(409, 'Transaction not found or its status has already changed.');
  res.json({ success: true });
});
export default router;
