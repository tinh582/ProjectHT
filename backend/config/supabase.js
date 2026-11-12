import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { isTransientSupabaseError } from '../src/http.js';

// Force IPv4-first DNS resolution and disable Node v24's 250ms Happy Eyeballs race
// so Windows sockets never get prematurely reset with ECONNRESET on *.supabase.co or localhost.
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false);
  }
} catch {
  // Ignore if unsupported by runtime
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);

/**
 * Fallback fetch using Node's native http/https module with `agent: false` (brand-new TCP/TLS socket,
 * bypassing Undici's keep-alive pool) whenever Undici hits a stale socket ECONNRESET.
 */
function freshSocketFetch(input, init = {}) {
  return new Promise((resolve, reject) => {
    try {
      const targetUrl = new URL(typeof input === 'string' ? input : input.url);
      const isHttps = targetUrl.protocol === 'https:';
      const transport = isHttps ? https : http;
      const headersObj = {};
      const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined) || {});
      headers.forEach((v, k) => {
        headersObj[k] = v;
      });
      headersObj.Connection = 'close';

      const req = transport.request(
        targetUrl,
        {
          method: init.method || (typeof input === 'object' && input.method) || 'GET',
          headers: headersObj,
          agent: false,
          family: 4
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const resHeaders = new Headers();
            for (const [k, v] of Object.entries(res.headers)) {
              if (Array.isArray(v)) v.forEach((item) => resHeaders.append(k, item));
              else if (v !== undefined) resHeaders.set(k, String(v));
            }
            const status = res.statusCode || 200;
            const body = status === 204 || status === 304 ? null : buffer;
            resolve(
              new Response(body, {
                status,
                statusText: res.statusMessage || '',
                headers: resHeaders
              })
            );
          });
          res.on('error', reject);
        }
      );

      if (init.signal) {
        if (init.signal.aborted) {
          req.destroy(init.signal.reason || new Error('Aborted'));
          return;
        }
        init.signal.addEventListener('abort', () => req.destroy(init.signal.reason || new Error('Aborted')), {
          once: true
        });
      }

      req.on('error', reject);

      if (init.body !== undefined && init.body !== null) {
        if (typeof init.body === 'string' || Buffer.isBuffer(init.body) || init.body instanceof Uint8Array) {
          req.write(init.body);
          req.end();
        } else if (typeof init.body.arrayBuffer === 'function') {
          init.body
            .arrayBuffer()
            .then((ab) => {
              req.write(Buffer.from(ab));
              req.end();
            })
            .catch(reject);
        } else {
          req.write(String(init.body));
          req.end();
        }
      } else {
        req.end();
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Creates a resilient fetch wrapper for @supabase/supabase-js that:
 * 1) Buffers the entire response body inside the retry loop so mid-stream ECONNRESET or
 *    truncated empty JSON bodies are caught and retried automatically.
 * 2) Falls back to a fresh non-pooled TCP/TLS socket (`agent: false`) on retry when
 *    Node's built-in Undici pool has a stale keep-alive socket.
 */
export function createResilientFetch({
  baseFetch = globalThis.fetch,
  maxRetries = 4,
  baseDelayMs = 120,
  timeoutMs = 12000
} = {}) {
  const isDefaultGlobalFetch = baseFetch === globalThis.fetch;

  return async function resilientSupabaseFetch(input, init = {}) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('SUPABASE_FETCH_TIMEOUT')), timeoutMs);

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
          headers.set('Connection', 'close');
          headers.set('X-Retry-Attempt', String(attempt));
        }

        const activeFetch = isDefaultGlobalFetch && attempt > 0 ? freshSocketFetch : baseFetch;
        const response = await activeFetch(input, {
          ...init,
          headers,
          signal: controller.signal
        });

        if (attempt < maxRetries && RETRYABLE_HTTP_STATUSES.has(response.status)) {
          clearTimeout(timer);
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

        // Buffer the full body inside the try/catch block so any mid-stream ECONNRESET
        // (at TCP.onStreamRead) is caught and retried before returning to Supabase SDK.
        if (response && typeof response.arrayBuffer === 'function' && response.status !== 204 && response.status !== 304) {
          const bodyBuffer = await response.arrayBuffer();
          clearTimeout(timer);

          const contentType = response.headers?.get?.('content-type') || '';
          if (
            attempt < maxRetries &&
            contentType.includes('application/json') &&
            bodyBuffer.byteLength === 0 &&
            response.status >= 200
          ) {
            const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
            console.warn(
              `[SUPABASE-RETRY] Empty JSON body on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          return new Response(bodyBuffer, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }

        clearTimeout(timer);
        return response;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;

        if (init.signal?.aborted) {
          throw err;
        }

        if (attempt < maxRetries && (isTransientSupabaseError(err) || err?.message === 'SUPABASE_FETCH_TIMEOUT')) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          console.warn(
            `[SUPABASE-RETRY] Network error (${err?.cause?.code || err?.code || err?.message || 'fetch failed'}) on attempt ${
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
