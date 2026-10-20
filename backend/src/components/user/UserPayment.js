import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId, rpc } from '../../http.js';
import { getSubscriptionStatus } from '../../subscription.js';
const router = express.Router();

router.get('/pricing', async (req, res) => {
  const { data, error } = await req.db.from('pricing_configs').select('id, plan_type, price').order('price');
  if (error) throw error;
  res.json(data || []);
});

router.get('/subscription/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const status = await getSubscriptionStatus(req.db, req.user.id);
  if (!status.latestTransaction) {
    return res.json({
      isActive: false,
      hasPending: status.hasPending,
      expiryDate: null,
    });
  }
  res.json({
    ...status.latestTransaction,
    isActive: status.isActive,
    hasPending: status.hasPending,
    expiryDate: status.expiryDate,
  });
});

router.post('/pay', async (req, res) => {
  const result = await rpc(req.db, 'request_parking_payment', {
    p_user_id: req.user.id, p_plan_id: requireId(req.body.planId),
  });
  res.json({ success: true, status: 'pending', transaction: result });
});
export default router;
