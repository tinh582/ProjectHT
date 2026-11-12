export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireText(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${name} is required (maximum ${max} characters).`);
  }
  return value.trim();
}

export function requireId(value) {
  if (!['string', 'number'].includes(typeof value) || !/^[a-zA-Z0-9-]{1,64}$/.test(String(value))) {
    throw new HttpError(400, 'Invalid identifier.');
  }
  return String(value);
}

export function pageRange(query) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 25);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || page > 1000000) {
    throw new HttpError(400, 'Invalid pagination.');
  }
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'FETCH_ERROR'
]);

/**
 * Determines whether a Supabase / network error is transient (e.g. stale socket,
 * DNS hiccup, Cloudflare 502/503/504/522, or AuthRetryableFetchError) and safe to retry.
 */
export function isTransientSupabaseError(error) {
  if (!error) return false;
  const status = Number(error.status || error.statusCode || 0);
  if (TRANSIENT_HTTP_STATUSES.has(status)) {
    return true;
  }
  const name = String(error.name || '');
  const code = String(error.code || error.cause?.code || '');
  if (
    name === 'AuthRetryableFetchError' ||
    name === 'AbortError' ||
    TRANSIENT_ERROR_CODES.has(code)
  ) {
    return true;
  }
  const msg = String(error.message || error.details || error.hint || error || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('socket') ||
    msg.includes('other side closed') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('epipe') ||
    msg.includes('eai_again') ||
    msg.includes('terminated') ||
    msg.includes('unexpected end of json input') ||
    msg.includes('bad gateway') ||
    msg.includes('service unavailable') ||
    msg.includes('gateway timeout') ||
    msg.includes('connection error') ||
    msg.includes('temporarily unavailable')
  );
}

/**
 * Executes a Supabase SDK or async operation with automatic retry and exponential backoff
 * whenever a transient connection or gateway error occurs, eliminating the need for users
 * to submit requests 2-3 times.
 */
export async function withSupabaseRetry(operation, { maxRetries = 3, baseDelayMs = 120 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation(attempt);
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        if (attempt < maxRetries && isTransientSupabaseError(result.error)) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 40);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isTransientSupabaseError(err)) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 40);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function rpc(db, name, args) {
  const { data, error } = await withSupabaseRetry(() => db.rpc(name, args));
  if (error) throw error;
  return data;
}

export function errorHandler(error, req, res, next) {
  const dbStatus = { P0001: 409, '23505': 409, '23503': 409, '22P02': 400, '23514': 400 };
  const status = error.status || dbStatus[error.code] || 500;
  if (status >= 500) console.error('API request failed:', error.message);
  res.status(status).json({ error: status >= 500 ? 'The request could not be completed. Please try again.' : error.message });
}
