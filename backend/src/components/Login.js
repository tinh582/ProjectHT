import express from 'express';
import { HttpError, isTransientSupabaseError, requireText, withSupabaseRetry } from '../http.js';
const router = express.Router();

router.post('/refresh', async (req, res) => {
  const refresh_token = requireText(req.body.refreshToken, 'Refresh token', 4096);
  const authClient = req.createAuthClient();
  const { data, error } = await withSupabaseRetry(() =>
    authClient.auth.refreshSession({ refresh_token })
  );
  if (error && (error.status >= 500 || isTransientSupabaseError(error))) {
    throw new HttpError(503, 'Authentication is temporarily unavailable.');
  }
  if (error || !data?.session) throw new HttpError(401, 'Please sign in again.');
  res.json({ session: data.session });
});

router.post('/', async (req, res) => {
  const email = requireText(req.body.email, 'Email');
  requireText(req.body.password, 'Password', 1024);
  const password = req.body.password;
  const authClient = req.createAuthClient();
  const { data, error } = await withSupabaseRetry(() =>
    authClient.auth.signInWithPassword({ email, password })
  );
  if (error && (error.status >= 500 || isTransientSupabaseError(error))) {
    throw new HttpError(503, 'Kết nối tới máy chủ xác thực đang tạm thời gián đoạn. Vui lòng thử lại.');
  }
  if (error) throw new HttpError(401, 'Invalid email or password.');
  res.json({ session: data.session, user: data.user });
});
export default router;
