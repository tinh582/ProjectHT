import { HttpError, isTransientSupabaseError, withSupabaseRetry } from './http.js';
import { runSql, sqlVal } from './nativeSql.js';

// Short-lived fallback cache for already-verified tokens when Supabase experiences a transient outage
const verifiedSessionCache = new Map();
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function authenticate({ db, createAuthClient }) {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
    if (!match) throw new HttpError(401, 'Please sign in.');
    const token = match[1];

    const authClient = createAuthClient();
    const { data, error } = await withSupabaseRetry(() => authClient.auth.getUser(token));

    if (error && (error.status >= 500 || isTransientSupabaseError(error))) {
      const cached = verifiedSessionCache.get(token);
      if (cached && Date.now() < cached.expiresAt) {
        req.user = cached.user;
        req.role = cached.role;
        return next();
      }
      throw new HttpError(503, 'Authentication is temporarily unavailable.');
    }
    if (error || !data?.user) {
      verifiedSessionCache.delete(token);
      throw new HttpError(401, 'Your session has expired. Please sign in again.');
    }

    // Copy-pasteable Supabase SQL Editor query:
    // SELECT role FROM public.profiles WHERE id = '<USER_UUID>' LIMIT 1;
    const { data: profile, error: profileError } = await runSql(
      db,
      `SELECT role
       FROM public.profiles
       WHERE id = ${sqlVal(data.user.id)}
       LIMIT 1;`,
      { maybeSingle: true }
    );
    if (profileError) {
      if (isTransientSupabaseError(profileError)) {
        const cached = verifiedSessionCache.get(token);
        if (cached && Date.now() < cached.expiresAt) {
          req.user = cached.user;
          req.role = cached.role;
          return next();
        }
      }
      throw profileError;
    }

    const role = profile?.role === 'customer' ? 'user' : profile?.role;
    if (!['user', 'staff', 'admin'].includes(role)) {
      verifiedSessionCache.delete(token);
      throw new HttpError(403, 'Your account does not have access.');
    }

    verifiedSessionCache.set(token, {
      user: data.user,
      role,
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS
    });

    req.user = data.user;
    req.role = role;
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
