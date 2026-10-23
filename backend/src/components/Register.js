import express from 'express';
import { HttpError, requireText } from '../http.js';
const router = express.Router();

router.post('/', async (req, res) => {
  const email = requireText(req.body.email, 'Email');
  requireText(req.body.password, 'Password', 1024);
  const password = req.body.password;
  const name = requireText(req.body.full_name, 'Full name');
  const phone = req.body.phone || null;
  const address = req.body.address || null;
  const id_card_front = req.body.id_card_front || null;
  const id_card_back = req.body.id_card_back || null;

  if (password.length < 8) throw new HttpError(400, 'Mật khẩu phải có ít nhất 8 ký tự.');

  if (phone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phone.replace(/\s+/g, ''))) {
    throw new HttpError(400, 'Số điện thoại không đúng định dạng Việt Nam.');
  }

  const { data, error } = await req.createAuthClient().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, phone, address },
    },
  });

  if (error) throw new HttpError(400, error.message);

  if (data.user && data.user.identities?.length > 0) {
    const kyc_status = (id_card_front && id_card_back) ? 'pending' : 'unverified';
    const profileRow = {
      id: data.user.id,
      name,
      email,
      role: 'user',
      phone,
      address,
      id_card_front,
      id_card_back,
      kyc_status,
      email_verified: false,
      privacy_accepted: true,
    };

    try {
      await req.db.from('profiles').upsert(profileRow, { onConflict: 'id', ignoreDuplicates: false });
    } catch (e) {
      await req.db.from('profiles').upsert(
        { id: data.user.id, name, email, role: 'user' },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
  }

  res.json({ session: data.session, user: data.user });
});

export default router;