import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const originalFetch = globalThis.fetch;
let apiFetch, events, storage;
beforeEach(async () => {
  storage = new Map([['token', 'old'], ['refresh_token', 'refresh']]);
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  events = [];
  globalThis.window = { dispatchEvent: event => events.push(event) };
  const source = (await readFile(new URL('../../frontend/src/lib/api.js', import.meta.url), 'utf8'))
    .replace('import.meta.env.VITE_API_BASE_URL', "'http://test.local'");
  ({ apiFetch } = await import(`data:text/javascript,${encodeURIComponent(source)}#${Math.random()}`));
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
  delete globalThis.window;
});

test('API helper adds auth to protected requests but not login requests', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({}); };
  await apiFetch('/api/components/user/Dashboard/vehicles/user');
  await apiFetch('/api/components/Login', { method: 'POST' });
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer old');
  assert.equal(calls[0].url, 'http://test.local/api/components/user/Dashboard/vehicles/user');
  assert.equal(calls[1].options.headers.get('Authorization'), null);
});

test('concurrent expired requests share one refresh and retry with the new token', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/refresh')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return Response.json({ session: { access_token: 'new', refresh_token: 'new-refresh' } });
    }
    return Response.json({}, { status: options.headers.get('Authorization') === 'Bearer new' ? 200 : 401 });
  };
  const responses = await Promise.all([apiFetch('/api/a'), apiFetch('/api/b')]);
  assert.ok(responses.every(response => response.ok));
  assert.equal(refreshes, 1);
  assert.equal(storage.get('token'), 'new');
});

test('network errors become failed responses with a visible error event', async () => {
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  const response = await apiFetch('/api/a');
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error);
  assert.equal(events.at(-1).type, 'api-error');
  assert.equal(storage.get('token'), 'old');
});

test('an invalid refresh clears the session and notifies the app', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Expired' }, { status: 401 });
  assert.equal((await apiFetch('/api/a')).status, 401);
  assert.equal(storage.has('token'), false);
  assert.ok(events.some(event => event.type === 'auth-expired'));
});

test('temporary refresh failures do not discard a valid saved session', async () => {
  globalThis.fetch = async url => Response.json({}, { status: url.endsWith('/refresh') ? 503 : 401 });
  assert.equal((await apiFetch('/api/a')).status, 503);
  assert.equal(storage.get('refresh_token'), 'refresh');
  assert.ok(events.every(event => event.type !== 'auth-expired'));
});
