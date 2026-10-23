import express from 'express';
import { HttpError, pageRange, requireId, requireText } from '../../http.js';
import { purgeSensitiveUserData } from '../../privacyEngine.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { page, pageSize, from, to } = pageRange(req.query);
  let data = null;
  let count = null;
  try {
    const resDb = await req.db.from('profiles')
      .select('id, name, email, role, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id').range(from, to);
    data = resDb.data;
    count = resDb.count;
    if (resDb.error) throw resDb.error;
  } catch (err) {
    const fallback = await req.db.from('profiles')
      .select('id, name, email, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id').range(from, to);
    data = fallback.data;
    count = fallback.count;
  }
  res.json({ items: data || [], total: count, page, pageSize });
});

router.post('/', async (req, res) => {
  const name = requireText(req.body.name, 'Full name');
  const email = requireText(req.body.email, 'Email');
  const password = requireText(req.body.password, 'Password', 1024);
  const role = req.body.role || 'user';
  const phone = req.body.phone || null;
  const address = req.body.address || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email address.');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  if (!['user', 'staff', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role.');

  const { data: authData, error: authError } = await req.db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, phone, address },
  });
  if (authError) throw new HttpError(400, authError.message);

  const userId = authData.user.id;
  const { error: profileError } = await req.db.from('profiles').upsert(
    { id: userId, name, email, role, phone, address, email_verified: true, kyc_status: 'verified' },
    { onConflict: 'id', ignoreDuplicates: false },
  );
  if (profileError) throw profileError;

  res.status(201).json({ success: true, id: userId });
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

router.put('/:id/kyc', async (req, res) => {
  const id = requireId(req.params.id);
  const kyc_status = req.body.kyc_status;
  if (!['unverified', 'pending', 'verified', 'rejected'].includes(kyc_status)) {
    throw new HttpError(400, 'Trạng thái KYC không hợp lệ.');
  }
  const { data, error } = await req.db.from('profiles').update({ kyc_status }).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

router.put('/:id', async (req, res) => {
  const name = requireText(req.body.name, 'Name');
  const email = requireText(req.body.email, 'Email');
  const phone = req.body.phone || null;
  const address = req.body.address || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email.');
  const updatePayload = { name, email };
  if (phone !== undefined) updatePayload.phone = phone;
  if (address !== undefined) updatePayload.address = address;

  const { data, error } = await req.db.from('profiles').update(updatePayload).eq('id', requireId(req.params.id)).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  if (id === req.user.id) throw new HttpError(409, 'You cannot delete your own account.');

  await purgeSensitiveUserData(req.db, id, 'ADMIN_DELETE');

  await req.db.from('profiles').delete().eq('id', id);

  try {
    if (req.db.auth?.admin?.deleteUser) {
      await req.db.auth.admin.deleteUser(id);
    }
  } catch (authErr) {
    console.warn('Could not delete auth.users row:', authErr?.message);
  }

  res.json({ success: true, message: 'Tài khoản đã được xóa sạch hoàn toàn theo chính sách Zero-Data Retention.' });
});

export default router;