import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../app.js';

function fakeClients() {
  const calls = [];
  let authClients = 0;
  const clients = {
    calls,
    get authClients() { return authClients; },
    createAuthClient() {
      authClients++;
      return { auth: {
        async getUser(token) { return { data: { user: ['admin', 'staff', 'user', 'customer'].includes(token) ? { id: token } : null } }; },
        async signInWithPassword(credentials) { calls.push({ login: credentials }); return { data: { user: { id: 'user' }, session: { access_token: 'user' } } }; },
      } };
    },
    db: {
      from(table) {
        const call = { table, methods: [] };
        calls.push(call);
        const query = {
          then(resolve, reject) {
            const id = call.methods.find(([name, column]) => name === 'eq' && column === 'id')?.[2];
            const isProfile = table === 'profiles' && call.methods.some(([name]) => name === 'maybeSingle');
            return Promise.resolve({ data: isProfile ? { role: id, id } : [], count: 0 }).then(resolve, reject);
          },
        };
        for (const name of ['select', 'eq', 'order', 'range', 'maybeSingle', 'single', 'insert', 'update', 'delete', 'limit', 'in']) {
          query[name] = (...args) => { call.methods.push([name, ...args]); return query; };
        }
        return query;
      },
      async rpc(name, args) { calls.push({ rpc: name, args }); return { data: { status: 'pending' } }; },
    },
  };
  return clients;
}

async function withApi(run) {
  const clients = fakeClients();
  const server = createApp(clients).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const request = (path, { token = 'user', body, method = 'GET' } = {}) => fetch(
    `http://127.0.0.1:${server.address().port}/api/components/${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try { await run(request, clients); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('unauthenticated requests cannot read or mutate protected routes', async () => withApi(async (request, clients) => {
  for (const path of ['admin/AdminUsers', 'staff/StaffSlotMap', 'user/Dashboard/vehicles/user']) {
    assert.equal((await request(path, { token: null })).status, 401);
    assert.equal((await request(path, { token: 'invalid' })).status, 401);
  }
  assert.equal(clients.calls.length, 0);
}));

test('role gates apply before database access to admin and staff data', async () => withApi(async request => {
  assert.equal((await request('admin/AdminUsers', { token: 'staff' })).status, 403);
  assert.equal((await request('staff/StaffSupport')).status, 403);
  assert.equal((await request('shared/SlotInfoDialog/vehicle')).status, 403);
  assert.equal((await request('staff/StaffSupport', { token: 'staff' })).status, 200);
}));

test('existing customer profiles retain ordinary user access without elevated permissions', async () => withApi(async request => {
  const response = await request('AppAuth', { token: 'customer' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).role, 'user');
  assert.equal((await request('user/Dashboard/vehicles/customer', { token: 'customer' })).status, 200);
  assert.equal((await request('admin/AdminUsers', { token: 'customer' })).status, 403);
  assert.equal((await request('staff/StaffSupport', { token: 'customer' })).status, 403);
}));

test('account IDs in URLs cannot access another account', async () => withApi(async request => {
  for (const path of ['user/Dashboard/vehicles/other', 'user/Dashboard/notifications/other', 'user/UserPayment/subscription/other']) {
    assert.equal((await request(path)).status, 403);
  }
  const ownVehicles = await request('user/Dashboard/vehicles/user');
  assert.equal(ownVehicles.status, 200);
  assert.deepEqual(await ownVehicles.json(), { vehicles: [], activeVehicleIds: [] });
}));

test('payment ignores client-supplied identity and price', async () => withApi(async (request, clients) => {
  const response = await request('user/UserPayment/pay', {
    method: 'POST', body: { planId: 'plan-1', userId: 'other', selectedPlan: { price: 1 } },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'pending');
  assert.deepEqual(clients.calls.find(call => call.rpc)?.args, { p_user_id: 'user', p_plan_id: 'plan-1' });
}));

test('slot changes and vehicle deletion forward the verified owner to atomic operations', async () => withApi(async (request, clients) => {
  assert.equal((await request('user/UserSlotPicker/save', {
    method: 'POST', body: { vehicleId: 'car', selectedSlotId: 'slot', currentSlotId: 'victim-slot', userId: 'other' },
  })).status, 200);
  assert.deepEqual(clients.calls.find(call => call.rpc)?.args, { p_user_id: 'user', p_vehicle_id: 'car', p_slot_id: 'slot' });
  assert.equal((await request('user/Dashboard/vehicles/car', { method: 'DELETE' })).status, 200);
  assert.equal(clients.calls.filter(call => call.rpc).at(-1).args.p_user_id, 'user');
}));

test('pagination is bounded and invalid roles/prices are rejected', async () => withApi(async (request, clients) => {
  assert.equal((await request('admin/AdminUsers?pageSize=10000', { token: 'admin' })).status, 400);
  const response = await request('admin/AdminUsers?page=2&pageSize=25', { token: 'admin' });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()), { items: [], total: 0, page: 2, pageSize: 25 });
  assert.ok(clients.calls.some(call => call.methods?.some(method => JSON.stringify(method) === '["range",25,49]')));
  assert.equal((await request('admin/AdminUsers/user/role', { token: 'admin', method: 'PUT', body: { role: 'owner' } })).status, 400);
  assert.equal((await request('admin/AdminPricing', { token: 'admin', method: 'POST', body: { plan_type: 'Monthly', price: -1 } })).status, 400);
}));

test('each login uses a fresh auth client and preserves password whitespace', async () => withApi(async (request, clients) => {
  for (let i = 0; i < 2; i++) {
    assert.equal((await request('Login', { token: null, method: 'POST', body: { email: 'a@example.com', password: ' secret ' } })).status, 200);
  }
  assert.equal(clients.authClients, 2);
  assert.equal(clients.calls[0].login.password, ' secret ');
}));

test('database conflicts return a failure instead of a successful mutation', async () => withApi(async (request, clients) => {
  clients.db.rpc = async () => ({ error: { code: 'P0001', message: 'Slot has already been taken.' } });
  const response = await request('user/UserSlotPicker/save', { method: 'POST', body: { vehicleId: 'car', selectedSlotId: 'slot' } });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /already been taken/);
}));
