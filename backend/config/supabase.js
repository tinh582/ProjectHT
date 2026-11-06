import dns from 'node:dns';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { isTransientSupabaseError } from '../src/http.js';

// Force IPv4-first DNS resolution so Node.js on Windows does not stall on dead IPv6 routes to *.supabase.co
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch {
  // Ignore if unsupported by runtime
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);

/**
 * Creates a resilient fetch wrapper for @supabase/supabase-js that automatically retries
 * on stale TCP keep-alive sockets (UND_ERR_SOCKET / ECONNRESET / TypeError: fetch failed),
 * DNS hiccups, and transient Cloudflare/Supabase gateway errors (502/503/504/520-524).
 */
export function createResilientFetch({
  baseFetch = globalThis.fetch,
  maxRetries = 3,
  baseDelayMs = 140,
  timeoutMs = 12000
} = {}) {
  return async function resilientSupabaseFetch(input, init = {}) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('SUPABASE_FETCH_TIMEOUT')), timeoutMs);

      // Forward caller abort signal if present
      if (init.signal) {
        if (init.signal.aborted) {
          clearTimeout(timer);
          throw init.signal.reason || new Error('Aborted');
        }
        init.signal.addEventListener('abort', () => controller.abort(init.signal.reason), { once: true });
      }

      try {
        const headers = new Headers(init.headers || {});
        if (attempt > 0) {
          headers.set('Cache-Control', 'no-cache, no-store');
          headers.set('X-Retry-Attempt', String(attempt));
        }

        const response = await baseFetch(input, {
          ...init,
          headers,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (attempt < maxRetries && RETRYABLE_HTTP_STATUSES.has(response.status)) {
          // Consume/cancel body to free socket before retrying
          try {
            await response.text();
          } catch {
            // Ignore body read error on retry
          }
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          console.warn(
            `[SUPABASE-RETRY] HTTP ${response.status} on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delay}ms...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        return response;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;

        // Do not retry if explicitly aborted by caller (not by our timeout)
        if (init.signal?.aborted) {
          throw err;
        }

        if (attempt < maxRetries && (isTransientSupabaseError(err) || err?.message === 'SUPABASE_FETCH_TIMEOUT')) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          console.warn(
            `[SUPABASE-RETRY] Network error (${err?.code || err?.message || 'fetch failed'}) on attempt ${
              attempt + 1
            }/${maxRetries + 1}. Retrying in ${delay}ms...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  };
}

export function createClients(env = process.env) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = env;
  if (!url || !anonKey || !serviceKey) {
    throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in backend/.env. See README.md.');
  }

  const resilientFetch = createResilientFetch();
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: resilientFetch,
      headers: {
        'X-Client-Info': 'ht-parking-resilient/2.0'
      }
    }
  };

  return {
    db: createClient(url, serviceKey, options),
    // A client that signs in must never be shared between requests.
    createAuthClient: () => createClient(url, anonKey, options)
  };
}
