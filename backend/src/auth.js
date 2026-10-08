import { HttpError } from './http.js';

export function authenticate({ db, createAuthClient }) {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
    if (!match) throw new HttpError(401, 'Please sign in.');
    const { data, error } = await createAuthClient().auth.getUser(match[1]);
    if (error && (error.status >= 500 || error.name === 'AuthRetryableFetchError')) {
      throw new HttpError(503, 'Authentication is temporarily unavailable.');
    }
    if (error || !data?.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
    const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !['user', 'staff', 'admin'].includes(profile.role)) throw new HttpError(403, 'Your account does not have access.');
    req.user = data.user;
    req.role = profile.role;
    next();
  };
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) throw new HttpError(403, 'You do not have permission for this action.');
    next();
  };
}

export function requireSelf(req, userId) {
  if (String(userId) !== req.user.id) throw new HttpError(403, 'You can only access your own account.');
}
