import express from 'express';
import { HttpError, pageRange, requireId, requireText } from '../../http.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { page, pageSize, from, to } = pageRange(req.query);
  const { data, count, error } = await req.db.from('profiles')
    .select('id, name, email, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id').range(from, to);
  if (error) throw error;
  res.json({ items: data || [], total: count, page, pageSize });
});
router.put('/:id/role', async (req, res) => {
  const id = requireId(req.params.id);
  const role = req.body.role;
  if (!['user', 'staff', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role.');
  if (id === req.user.id) throw new HttpError(409, 'You cannot change your own role.');
  const { data, error } = await req.db.from('profiles').update({ role }).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});
router.put('/:id', async (req, res) => {
  const name = requireText(req.body.name, 'Name');
  const email = requireText(req.body.email, 'Email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email.');
  const { data, error } = await req.db.from('profiles').update({ name, email }).eq('id', requireId(req.params.id)).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});
router.delete('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  if (id === req.user.id) throw new HttpError(409, 'You cannot delete your own profile.');
  const { data, error } = await req.db.from('profiles').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});
export default router;
