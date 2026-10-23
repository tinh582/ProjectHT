import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../app.js';
import { analyzeAndHandleError, aiErrorHandlerMiddleware } from '../src/aiErrorHandler.js';
import { verifyPaymentReceipt } from '../src/paymentAi.js';
import { purgeSensitiveUserData } from '../src/privacyEngine.js';
import { dispatchStaffAlert } from '../src/notifications.js';

// ==========================================
// 1. UNIT TESTS: AI Error Handler
// ==========================================
test('AI Error Handler: correctly classifies SCHEMA_MISMATCH and applies fallback', () => {
  const err = new Error('column transactions.cycle_start does not exist');
  err.code = '42703';
  const result = analyzeAndHandleError(err, { path: '/api/transactions' });
  assert.equal(result.category, 'SCHEMA_MISMATCH');
  assert.equal(result.severity, 'high');
  assert.equal(result.fallbackApplied, true);
  assert.ok(result.recommendedAction.includes('migration'));
});

test('AI Error Handler: correctly classifies NETWORK_AI_SERVICE failure', () => {
  const err = new Error('Roboflow fetch failed: connection timeout');
  const result = analyzeAndHandleError(err);
  assert.equal(result.category, 'NETWORK_AI_SERVICE');
  assert.equal(result.severity, 'medium');
  assert.equal(result.fallbackApplied, true);
});

test('AI Error Handler: correctly classifies DATABASE_CONFLICT', () => {
  const err = new Error('duplicate key value violates unique constraint');
  err.code = '23505';
  const result = analyzeAndHandleError(err);
  assert.equal(result.category, 'DATABASE_CONFLICT');
  assert.equal(result.severity, 'low');
  assert.equal(result.fallbackApplied, false);
});

test('AI Error Handler: middleware properly decorates express error responses', () => {
  let capturedStatus = 0;
  let capturedJson = null;
  const mockRes = {
    status(code) { capturedStatus = code; return this; },
    json(obj) { capturedJson = obj; return this; },
  };
  const mockReq = { originalUrl: '/api/test', method: 'GET', user: { id: 'u1' } };
  const error = new Error('Slot has already been taken.');
  error.code = 'P0001';

  aiErrorHandlerMiddleware(error, mockReq, mockRes, () => {});

  assert.equal(capturedStatus, 409);
  assert.equal(capturedJson.error, 'Slot has already been taken.');
  assert.ok(capturedJson.aiAnalysis);
  assert.equal(capturedJson.aiAnalysis.category, 'DATABASE_CONFLICT');
  assert.equal(capturedJson.aiAnalysis.severity, 'low');
});

// ==========================================
// 2. UNIT TESTS: AI Payment Proof OCR
// ==========================================
test('Payment AI: auto-approves when receipt amount and user identifier match', () => {
  const receipt = 'Chuyển khoản thành công 200,000 VND đến HT-PARKING. Nội dung: user-999 thanh toan goi thang';
  const result = verifyPaymentReceipt(receipt, 200000, 'user-999');
  assert.equal(result.autoApproved, true);
  assert.equal(result.matchedAmount, 200000);
  assert.equal(result.hasUserCode, true);
  assert.ok(result.reason.includes('Duyệt tự động'));
});

test('Payment AI: routes to manual verification when receipt amount matches but user ID is missing', () => {
  const receipt = 'Giao dịch 50.000 đ thành công tại Vietcombank';
  const result = verifyPaymentReceipt(receipt, 50000, 'user-888');
  assert.equal(result.autoApproved, false);
  assert.equal(result.matchedAmount, 50000);
  assert.equal(result.hasUserCode, false);
  assert.ok(result.reason.includes('Khớp số tiền'));
});

test('Payment AI: rejects auto-approval when receipt amount mismatches', () => {
  const receipt = 'Chuyển khoản 10.000 đ từ user-777';
  const result = verifyPaymentReceipt(receipt, 500000, 'user-777');
  assert.equal(result.autoApproved, false);
  assert.equal(result.matchedAmount, null);
});

// ==========================================
// 3. UNIT TESTS: Privacy Engine & Zero-Data Purge
// ==========================================
test('Privacy Engine: purgeSensitiveUserData clears CCCD, phone, sessions and frees slots', async () => {
  const executedUpdates = [];
  const executedDeletes = [];

  const fakeDb = {
    from(table) {
      return {
        select() {
          return {
            eq(col, val) {
              return Promise.resolve({ data: [{ id: 'veh-1' }, { id: 'veh-2' }] });
            },
          };
        },
        update(fields) {
          return {
            in(col, vals) {
              executedUpdates.push({ table, fields, in: { col, vals } });
              return Promise.resolve({ error: null });
            },
            eq(col, val) {
              executedUpdates.push({ table, fields, eq: { col, val } });
              return Promise.resolve({ error: null });
            },
          };
        },
        delete() {
          return {
            in(col, vals) {
              executedDeletes.push({ table, in: { col, vals } });
              return Promise.resolve({ error: null });
            },
            eq(col, val) {
              executedDeletes.push({ table, eq: { col, val } });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await purgeSensitiveUserData(fakeDb, 'user-123', 'GDPR_ZERO_DATA');
  assert.equal(result.success, true);
  assert.equal(result.status, 'ZERO_DATA_APPLIED');

  // Verify slot release
  const slotRelease = executedUpdates.find(u => u.table === 'parking_slots');
  assert.ok(slotRelease);
  assert.equal(slotRelease.fields.status, 'empty');
  assert.equal(slotRelease.fields.vehicle_id, null);

  // Verify profile zero-retention wipe
  const profileWipe = executedUpdates.find(u => u.table === 'profiles');
  assert.ok(profileWipe);
  assert.equal(profileWipe.fields.phone, null);
  assert.equal(profileWipe.fields.address, null);
  assert.equal(profileWipe.fields.id_card_front, null);
  assert.equal(profileWipe.fields.id_card_back, null);
  assert.equal(profileWipe.fields.kyc_status, 'purged');

  // Verify transaction proof wipe
  const txWipe = executedUpdates.find(u => u.table === 'transactions');
  assert.ok(txWipe);
  assert.equal(txWipe.fields.payment_proof, null);
});

// ==========================================
// 4. UNIT TESTS: Multi-Channel Staff Alert
// ==========================================
test('Staff Alert: dispatches in-app notifications to staff and admin users', async () => {
  let insertedRows = [];
  const fakeDb = {
    from(table) {
      return {
        select() {
          return {
            in(col, roles) {
              return Promise.resolve({
                data: [{ id: 'staff-1' }, { id: 'admin-1' }],
              });
            },
          };
        },
        insert(rows) {
          insertedRows = rows;
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const alert = await dispatchStaffAlert(fakeDb, {
    title: 'Biên lai cần duyệt',
    message: 'Khách hàng vừa gửi biên lai mới',
    priority: 'high',
  });

  assert.equal(alert.success, true);
  assert.equal(insertedRows.length, 2);
  assert.ok(insertedRows[0].title.includes('Biên lai cần duyệt'));
  assert.equal(insertedRows[0].user_id, 'staff-1');
  assert.equal(insertedRows[1].user_id, 'admin-1');
});

// ==========================================
// 5. INTEGRATION TESTS: API Routes for Improvements
// ==========================================
function mockImprovementsApi() {
  const store = {
    profiles: [
      { id: 'user', role: 'user', phone: '0987654321', address: '123 Le Loi, Q1', kyc_status: 'pending', id_card_front: 'front.jpg', id_card_back: 'back.jpg' },
      { id: 'admin', role: 'admin' },
    ],
    pricing: [{ id: 'plan-1', plan_type: 'Monthly', price: 200000 }],
    slots: [
      { id: 'slot-1', zone_id: 'zone-1', slot_name: 'A-01', status: 'empty', parking_zones: { id: 'zone-1', zone_name: 'Zone A', vehicle_type: 'car', drainage_status: 'Tốt', sensor_status: 'Hoạt động', cctv_coverage: 'Góc rộng 24/7', lighting_status: 'Đèn LED cảm ứng' } }
    ],
    zones: [
      { id: 'zone-1', zone_name: 'Zone A', vehicle_type: 'car', total_capacity: 50, current_occupancy: 20, drainage_status: 'Tốt', sensor_status: 'Hoạt động', cctv_coverage: 'Góc rộng 24/7', lighting_status: 'Đèn LED cảm ứng' }
    ],
    transactions: [],
  };

  return {
    createAuthClient() {
      return {
        auth: {
          async getUser(token) {
            return { data: { user: ['admin', 'staff', 'user'].includes(token) ? { id: token } : null } };
          },
        },
      };
    },
    db: {
      from(table) {
        let currentQuery = { table, updates: null, inserts: null, filters: [] };
        const builder = {
          select(fields) { return builder; },
          eq(col, val) {
            currentQuery.filters.push({ type: 'eq', col, val });
            return builder;
          },
          in(col, vals) {
            currentQuery.filters.push({ type: 'in', col, vals });
            return builder;
          },
          order() { return builder; },
          limit() { return builder; },
          update(updates) {
            currentQuery.updates = updates;
            if (table === 'profiles') {
              const target = store.profiles.find(p => p.id === 'user');
              if (target) Object.assign(target, updates);
            }
            return builder;
          },
          delete() {
            return builder;
          },
          insert(row) {
            currentQuery.inserts = row;
            return builder;
          },
          single() {
            return builder.then(res => ({ data: Array.isArray(res.data) ? res.data[0] : res.data, error: null }));
          },
          maybeSingle() {
            return builder.then(res => ({ data: Array.isArray(res.data) ? (res.data[0] || null) : res.data, error: null }));
          },
          then(resolve) {
            if (table === 'pricing_configs') return resolve({ data: store.pricing[0], error: null });
            if (table === 'profiles') {
              const eqId = currentQuery.filters.find(f => f.col === 'id')?.val;
              const item = store.profiles.find(p => p.id === eqId) || store.profiles[0];
              return resolve({ data: item, error: null });
            }
            if (table === 'parking_zones') return resolve({ data: store.zones, error: null });
            if (table === 'parking_slots') return resolve({ data: store.slots, error: null });
            if (table === 'transactions') {
              return resolve({
                data: [{ id: 'tx-123', amount: 200000, plan_name: 'Monthly', status: 'completed', confirmed_at: new Date().toISOString() }],
                error: null,
              });
            }
            if (table === 'vehicles') {
              return resolve({ data: [{ id: 'veh-1' }], error: null });
            }
            if (table === 'notifications') {
              return resolve({ data: [], error: null });
            }
            return resolve({ data: [], error: null });
          },
        };
        return builder;
      },
      async rpc(name, args) {
        if (name === 'request_parking_payment') {
          return { data: { id: 'tx-123', status: 'pending', amount: 200000 } };
        }
        if (name === 'reserve_parking_slot') {
          return { data: { success: true } };
        }
        return { data: {} };
      },
    },
  };
}

async function withCustomApi(clients, run) {
  const server = createApp(clients).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const request = (path, { token = 'user', body, method = 'GET' } = {}) => fetch(
    `http://127.0.0.1:${server.address().port}/api/components/${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    await run(request);
  } finally {
    await new Promise(res => server.close(res));
  }
}

test('User Profile API: fetches profile with phone, address, and KYC status', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const res = await request('user/Dashboard/profile/user');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.phone, '0987654321');
    assert.equal(body.address, '123 Le Loi, Q1');
    assert.equal(body.kyc_status, 'pending');
  });
});

test('User Profile API: updates personal information and KYC documents', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const res = await request('user/Dashboard/profile/user', {
      method: 'PUT',
      body: { phone: '0912345678', address: '456 Nguyen Hue, Q1', id_card_front: 'new_front.jpg', id_card_back: 'new_back.jpg' },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });
});

test('User Profile API: user can execute Zero-Data purge on own account', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const res = await request('user/Dashboard/profile/user/purge-data', {
      method: 'POST',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.message.includes('xóa sạch hoàn toàn'));
  });
});

test('Admin Users API: admin can review and approve user KYC', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const res = await request('admin/AdminUsers/user/kyc', {
      token: 'admin',
      method: 'PUT',
      body: { kyc_status: 'verified', note: 'Giấy tờ hợp lệ' },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });
});

test('User Slot Picker API: includes technical infrastructure in slot results', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const res = await request('user/UserSlotPicker/car');
    assert.equal(res.status, 200);
    const slots = await res.json();
    assert.ok(Array.isArray(slots));
    assert.equal(slots[0].slot_name, 'A-01');
    assert.equal(slots[0].parking_zones.drainage_status, 'Tốt');
    assert.equal(slots[0].parking_zones.cctv_coverage, 'Góc rộng 24/7');
  });
});

test('User Payment API: auto-verifies and completes subscription when valid receipt is uploaded', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const validReceipt = 'Giao dich thanh toan 200,000 VND. Ma user';
    const res = await request('user/UserPayment/pay', {
      method: 'POST',
      body: {
        planId: 'plan-1',
        proofImage: validReceipt,
        selectedSlotId: 'slot-1',
        vehicleId: 'veh-1',
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.autoVerified, true);
    assert.equal(body.status, 'completed');
    assert.ok(body.message.includes('AI'));
  });
});

test('User Payment API: leaves transaction pending when payment receipt requires manual staff inspection', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const ambiguousReceipt = 'Bien lai chuyen khoan Vietcombank khong ro so tien';
    const res = await request('user/UserPayment/pay', {
      method: 'POST',
      body: {
        planId: 'plan-1',
        proofImage: ambiguousReceipt,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.autoVerified, false);
    assert.equal(body.status, 'pending');
    assert.ok(body.message.includes('Nhân viên đang kiểm tra'));
  });
});

test('Admin Reports API: car-centric analytics returns accurate metrics and technical infrastructure', async () => {
  const clients = mockImprovementsApi();
  await withCustomApi(clients, async (request) => {
    const res = await request('admin/AdminReports/car-metrics', { token: 'admin' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.carMetrics);
    assert.equal(typeof data.carMetrics.carAvailable, 'number');
    assert.equal(typeof data.carMetrics.carActiveInLot, 'number');
    assert.equal(typeof data.carMetrics.carOccupancyRate, 'number');
    assert.ok(Array.isArray(data.carMetrics.infrastructureZones));
    assert.equal(data.carMetrics.infrastructureZones[0].drainage_status, 'Tốt');
  });
});
