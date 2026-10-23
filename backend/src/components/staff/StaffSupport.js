import express from 'express';
import { HttpError, pageRange, requireId } from '../../http.js';
import { dispatchStaffAlert } from '../../notifications.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { page, pageSize, from, to } = pageRange(req.query);
  let data = null;
  let count = null;

  try {
    const resDb = await req.db.from('transactions')
      .select('id, plan_name, amount, status, created_at, confirmed_at, cycle_start, cycle_end, payment_proof, auto_verified, verified_by, profiles(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id').range(from, to);
    data = resDb.data;
    count = resDb.count;
    if (resDb.error) throw resDb.error;
  } catch (err) {
    const fallback = await req.db.from('transactions')
      .select('id, plan_name, amount, status, created_at, profiles(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id').range(from, to);
    data = fallback.data;
    count = fallback.count;
  }

  res.json({ items: data || [], total: count, page, pageSize });
});

router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['completed', 'refunded'].includes(status)) throw new HttpError(400, 'Invalid status.');
  const previousStatus = status === 'completed' ? 'pending' : 'completed';
  const now = new Date();
  const cycleEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const changes = status === 'completed' 
    ? { 
        status, 
        confirmed_at: now.toISOString(),
        cycle_start: now.toISOString(),
        cycle_end: cycleEnd.toISOString(),
        verified_by: req.user?.email || 'Staff'
      } 
    : { status };

  let { data, error } = await req.db.from('transactions').update(changes)
    .eq('id', requireId(req.params.id)).eq('status', previousStatus).select('id, user_id, plan_name').maybeSingle();

  if (error && error.code === '42703' && status === 'completed') {
    const fallback = await req.db.from('transactions').update({ status, confirmed_at: now.toISOString() })
      .eq('id', requireId(req.params.id)).eq('status', previousStatus).select('id, user_id, plan_name').maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) throw new HttpError(409, 'Transaction not found or its status has already changed.');

  if (data.user_id) {
    const msg = status === 'completed' 
      ? `Gói cước ${data.plan_name || ''} của bạn đã được nhân viên xác nhận thành công!`
      : `Gói cước ${data.plan_name || ''} của bạn đã được hoàn tiền.`;
    await req.db.from('notifications').insert({
      user_id: data.user_id,
      title: status === 'completed' ? 'Xác nhận thanh toán' : 'Hoàn tiền giao dịch',
      message: msg,
    });
  }

  res.json({ success: true });
});

export default router;