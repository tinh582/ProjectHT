import express from 'express';
import { HttpError, requireText } from '../http.js';
const router = express.Router();

router.post('/', async (req, res) => {
  const email = requireText(req.body.email, 'Email');
  requireText(req.body.password, 'Password', 1024);
  const password = req.body.password;
  const name = requireText(req.body.full_name, 'Full name');
  if (password.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
  const { data, error } = await req.createAuthClient().auth.signUp({
    email, password, options: { data: { full_name: name, phone: req.body.phone } },
  });
  if (error) throw new HttpError(400, error.message);
  // Confirmation-enabled duplicate signups can return an obfuscated user.
  if (data.user && data.user.identities?.length > 0) {
    const { error: profileError } = await req.db.from('profiles').upsert(
      { id: data.user.id, name, email, role: 'user' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (profileError) throw profileError;
  }
  res.json({ session: data.session, user: data.user });
});
export default router;
