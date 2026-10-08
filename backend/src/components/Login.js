import express from 'express';
import { HttpError, requireText } from '../http.js';
const router = express.Router();

router.post('/refresh', async (req, res) => {
  const refresh_token = requireText(req.body.refreshToken, 'Refresh token', 4096);
  const { data, error } = await req.createAuthClient().auth.refreshSession({ refresh_token });
  if (error && (error.status >= 500 || error.name === 'AuthRetryableFetchError')) {
    throw new HttpError(503, 'Authentication is temporarily unavailable.');
  }
  if (error || !data.session) throw new HttpError(401, 'Please sign in again.');
  res.json({ session: data.session });
});

router.post('/', async (req, res) => {
  const email = requireText(req.body.email, 'Email');
  requireText(req.body.password, 'Password', 1024);
  const password = req.body.password;
  const { data, error } = await req.createAuthClient().auth.signInWithPassword({ email, password });
  if (error) throw new HttpError(401, 'Invalid email or password.');
  res.json({ session: data.session, user: data.user });
});
export default router;
