import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
let owner, other, vehicle, secondVehicle, zone, otherZone, slot, secondSlot, plan;
const sqlFile = path => readFile(new URL(path, import.meta.url), 'utf8');
async function row(sql, params = []) { return (await db.query(sql, params)).rows[0]; }
async function reserve(user, car, space) {
  return db.query('select reserve_parking_slot($1, $2, $3)', [user, car, space]);
}
async function transition(plate = 'TEST-1', sessionId = null) {
  return row('select transition_parking_session($1, $2) as result', [plate, sessionId]);
}
before(async () => {
  db = new PGlite();
  await db.exec(await sqlFile('./schema.sql'));
  await db.exec(await sqlFile('../migrations/001_parking_integrity.sql'));
});
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('truncate notifications, transactions, parking_sessions, parking_slots, vehicles, parking_zones, pricing_configs, profiles, auth.users cascade');
  owner = (await row('insert into auth.users default values returning id')).id;
  await db.query("insert into profiles(id, name) values($1, 'Owner')", [owner]);
  other = (await row('insert into auth.users default values returning id')).id;
  await db.query("insert into profiles(id, name) values($1, 'Other')", [other]);
  vehicle = (await row("insert into vehicles(user_id, plate, type) values($1, 'TEST-1', 'car') returning id", [owner])).id;
  secondVehicle = (await row("insert into vehicles(user_id, plate, type) values($1, 'TEST-2', 'car') returning id", [other])).id;
  zone = (await row("insert into parking_zones(zone_name, vehicle_type, total_capacity, current_occupancy) values('A', 'car', 10, 0) returning id")).id;
  otherZone = (await row("insert into parking_zones(zone_name, vehicle_type, total_capacity, current_occupancy) values('B', 'car', 10, 0) returning id")).id;
  slot = (await row("insert into parking_slots(zone_id, slot_name) values($1, 'A-1') returning id", [zone])).id;
  secondSlot = (await row("insert into parking_slots(zone_id, slot_name) values($1, 'A-2') returning id", [zone])).id;
  plan = (await row("insert into pricing_configs(plan_type, price) values('Monthly', 200000) returning id")).id;
});

test('reservation checks ownership and prevents overwriting a claimed slot', async () => {
  await assert.rejects(reserve(other, vehicle, slot), /not owned/);
  await reserve(owner, vehicle, slot);
  await assert.rejects(reserve(other, secondVehicle, slot), /already been taken/);
  assert.equal((await row('select vehicle_id from parking_slots where id = $1', [slot])).vehicle_id, vehicle);
});

test('failed slot switch preserves the old reservation; valid switch releases it', async () => {
  await reserve(owner, vehicle, slot);
  await reserve(other, secondVehicle, secondSlot);
  await assert.rejects(reserve(owner, vehicle, secondSlot), /already been taken/);
  assert.equal((await row('select vehicle_id from parking_slots where id = $1', [slot])).vehicle_id, vehicle);
  await db.query("update parking_slots set vehicle_id = null, status = 'empty' where id = $1", [secondSlot]);
  await reserve(owner, vehicle, secondSlot);
  assert.equal((await row('select vehicle_id from parking_slots where id = $1', [slot])).vehicle_id, null);
});

test('incompatible vehicle types cannot reserve a slot', async () => {
  await db.query("update parking_zones set vehicle_type = 'motorbike' where id = $1", [zone]);
  await assert.rejects(reserve(owner, vehicle, slot), /vehicle type/);
});

test('payment requests use database prices, stay pending, and deduplicate retries', async () => {
  const request = () => row('select request_parking_payment($1, $2) as result', [owner, plan]);
  const first = (await request()).result;
  const retry = (await request()).result;
  assert.equal(first.id, retry.id);
  assert.equal(first.amount, 200000);
  assert.equal(first.status, 'pending');
  await reserve(owner, vehicle, slot);
  await assert.rejects(transition(), /confirmed, unexpired/);
});

test('check-out decrements the actual zone, including manual close, and is not repeated', async () => {
  await reserve(owner, vehicle, slot);
  await db.query("insert into transactions(user_id, status, amount, plan_name) values($1, 'completed', 200000, 'Monthly')", [owner]);
  await transition();
  assert.equal((await row('select current_occupancy from parking_zones where id = $1', [zone])).current_occupancy, 1);
  await assert.rejects(reserve(owner, vehicle, secondSlot), /parked vehicle/);
  const session = (await row("select id from parking_sessions where status = 'active'")).id;
  await transition(null, session);
  await assert.rejects(transition(null, session), /already been closed/);
  assert.equal((await row('select current_occupancy from parking_zones where id = $1', [zone])).current_occupancy, 0);
  assert.equal((await row('select current_occupancy from parking_zones where id = $1', [otherZone])).current_occupancy, 0);
  assert.equal((await row('select status from parking_slots where id = $1', [slot])).status, 'rented');
});

test('a failure in the final notification rolls back the entire parking operation', async () => {
  await reserve(owner, vehicle, slot);
  await db.query("insert into transactions(user_id, status, amount, plan_name) values($1, 'completed', 200000, 'Monthly')", [owner]);
  await db.exec("alter table notifications add constraint reject_parking_notification check(title <> 'Parking update')");
  try {
    await assert.rejects(transition(), /reject_parking_notification/);
    assert.equal((await row('select count(*)::int as count from parking_sessions')).count, 0);
    assert.equal((await row('select status from parking_slots where id = $1', [slot])).status, 'rented');
    assert.equal((await row('select current_occupancy from parking_zones where id = $1', [zone])).current_occupancy, 0);
  } finally {
    await db.exec('alter table notifications drop constraint reject_parking_notification');
  }
});

test('vehicle edits enforce ownership, release incompatible slots, and block parked edits', async () => {
  await reserve(owner, vehicle, slot);
  await assert.rejects(db.query('select edit_parking_vehicle($1,$2,$3,false)', [other, vehicle, {}]), /not owned/);
  await db.query('select edit_parking_vehicle($1,$2,$3,false)', [owner, vehicle, { type: 'motorbike', plate: 'NEW' }]);
  assert.equal((await row('select vehicle_id from parking_slots where id = $1', [slot])).vehicle_id, null);
  await db.query("insert into parking_sessions(vehicle_id,status) values($1,'active')", [vehicle]);
  await assert.rejects(db.query('select edit_parking_vehicle($1,$2,$3,true)', [owner, vehicle, {}]), /parked vehicle/);
});

test('slot initialization is repeatable and zone deletion rejects reservations', async () => {
  await db.query('select initialize_parking_slots($1)', [zone]);
  await db.query('select initialize_parking_slots($1)', [zone]);
  assert.equal((await row('select count(*)::int as count from parking_slots where zone_id = $1', [zone])).count, 10);
  await reserve(owner, vehicle, slot);
  await assert.rejects(db.query('select delete_parking_zone($1)', [zone]), /Release all/);
});

test('reports aggregate a seven-day window using the configured local day', async () => {
  await db.query(`insert into transactions(user_id,status,amount,created_at,plan_name) values
    ($1,'completed',100,now(),'Monthly'), ($1,'pending',900,now(),'Monthly'),
    ($1,'completed',200,now() - interval '20 days','Monthly'),
    ($1,'completed',50, ((now() at time zone 'Asia/Ho_Chi_Minh')::date)::timestamp at time zone 'Asia/Ho_Chi_Minh','Monthly')`, [owner]);
  const { report } = await row("select parking_report('Asia/Ho_Chi_Minh') as report");
  assert.equal(report.todayRevenue, 150);
  assert.equal(report.reportData.length, 7);
  assert.equal(report.reportData.reduce((sum, day) => sum + day.revenue, 0), 150);
  assert.equal(report.availableSpots, 20);
});

test('unique constraints prevent duplicate active sessions and duplicate plates', async () => {
  await db.query("insert into parking_sessions(vehicle_id,status) values($1,'active')", [vehicle]);
  await assert.rejects(db.query("insert into parking_sessions(vehicle_id,status) values($1,'active')", [vehicle]), /parking_one_active_session/);
  await assert.rejects(db.query("insert into vehicles(user_id,plate) values($1,' test-1 ')", [owner]), /parking_unique_plate/);
});

test('subscriptions and revenue start at confirmation, not the original request date', async () => {
  await reserve(owner, vehicle, slot);
  await db.query(`insert into transactions(user_id,status,amount,created_at,confirmed_at,plan_name)
    values($1,'completed',300,now() - interval '40 days',now(),'Monthly')`, [owner]);
  assert.match((await transition()).result.message, /CHECK-IN/);
  assert.equal((await row("select parking_report('Asia/Ho_Chi_Minh') as report")).report.todayRevenue, 300);
});

test('anonymous and authenticated roles cannot bypass the API', async () => {
  for (const role of ['anon', 'authenticated']) {
    assert.equal((await row("select has_function_privilege($1, 'reserve_parking_slot(text,text,text)', 'EXECUTE') as allowed", [role])).allowed, false);
    assert.equal((await row("select has_table_privilege($1, 'profiles', 'UPDATE') as allowed", [role])).allowed, false);
  }
  assert.equal((await row("select has_function_privilege('service_role', 'reserve_parking_slot(text,text,text)', 'EXECUTE') as allowed")).allowed, true);
});
