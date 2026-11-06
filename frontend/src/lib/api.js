const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
let refreshRequest;

const RETRYABLE_STATUSES = new Set([408, 425, 429, 502, 503, 504, 520, 521, 522, 523, 524]);

export function clearSession() {
  for (const key of ['token', 'refresh_token', 'user']) localStorage.removeItem(key);
}

/**
 * Sends an HTTP request with automatic retry and exponential backoff on transient
 * network drops or Supabase/gateway 502/503/504 responses so users never have to
 * click a second or third time.
 */
async function send(path, options = {}, { maxRetries = 2, baseDelayMs = 200 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeout);

      if (attempt < maxRetries && RETRYABLE_STATUSES.has(response.status)) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (options.signal?.aborted) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function refreshSession() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return 'invalid';
  try {
    const response = await send('/api/components/Login/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return response.status === 401 ? 'invalid' : 'unavailable';
    const { session } = await response.json();
    if (localStorage.getItem('refresh_token') !== refreshToken) return 'invalid';
    localStorage.setItem('token', session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

// Keep the standard Response interface while handling auth, timeouts and errors
// consistently for all screens. Failed requests never masquerade as success.
export async function apiFetch(path, options = {}) {
  const isPublic = /^\/api\/components\/(Login|Register)(\/|$)/.test(path);
  const headers = new Headers(options.headers);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = localStorage.getItem('token');
  if (token && !isPublic) headers.set('Authorization', `Bearer ${token}`);
  let response;
  try {
    response = await send(path, { ...options, headers });
    if (response.status === 401 && !isPublic) {
      let refreshResult;
      if (localStorage.getItem('token') && localStorage.getItem('token') !== token) {
        refreshResult = 'ok';
      } else {
        refreshRequest ||= refreshSession().finally(() => { refreshRequest = undefined; });
        refreshResult = await refreshRequest;
      }
      if (refreshResult === 'unavailable') throw new Error('Session refresh unavailable');
      if (refreshResult === 'ok') {
        headers.set('Authorization', `Bearer ${localStorage.getItem('token')}`);
        response = await send(path, { ...options, headers });
      }
      if (response.status === 401) {
        clearSession();
        window.dispatchEvent(new Event('auth-expired'));
      }
    }
  } catch (error) {
    response = new Response(JSON.stringify({ error: error.name === 'AbortError'
      ? 'Yêu cầu quá thời gian. Vui lòng thử lại.' : 'Không thể kết nối máy chủ. Vui lòng thử lại.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!response.ok) {
    const data = await response.clone().json().catch(() => ({}));
    window.dispatchEvent(new CustomEvent('api-error', { detail: data.error || 'Yêu cầu không thành công.' }));
  }
  return response;
}
