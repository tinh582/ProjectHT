import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId, rpc } from '../../http.js';
const router = express.Router();

router.get('/pricing', async (req, res) => {
  const { data, error } = await req.db.from('pricing_configs').select('id, plan_type, price').order('price');
  if (error) throw error;
  res.json(data || []);
});

router.get('/subscription/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data, error } = await req.db.from('transactions').select('id, plan_name, amount, created_at, confirmed_at')
    .eq('user_id', req.user.id).eq('status', 'completed')
    .order('confirmed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  res.json(data);
});

router.post('/pay', async (req, res) => {
  const result = await rpc(req.db, 'request_parking_payment', {
    p_user_id: req.user.id, p_plan_id: requireId(req.body.planId),
  });
  res.json({ success: true, status: 'pending', transaction: result });
});
export default router;
