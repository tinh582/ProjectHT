import express from 'express';
import { HttpError, requireId, requireText } from '../../http.js';
import { computeParkingMapSummary } from '../staff/StaffSlotMap.js';
import { NATIVE_SQL, runSql, sqlVal, sqlSet, sqlValues } from '../../nativeSql.js';

const router = express.Router();

// In-memory store for rich infrastructure metadata fallback when DB columns are not migrated yet
const zoneInfraCache = new Map();

// 0. READ FULL MAP SUMMARY (Zones + Slots + Specific Counts for Admin)
// Copy-pasteable Supabase SQL Editor query:
// SELECT * FROM public.v_parking_map_zone_summary;
router.get('/summary', async (req, res) => {
  const [zoneRes, slotRes] = await Promise.all([
    runSql(
      req.db,
      `SELECT id, zone_name, vehicle_type, total_capacity, current_occupancy
       FROM public.parking_zones
       ORDER BY created_at;`
    ),
    runSql(
      req.db,
      `SELECT id, zone_id, slot_name, status, vehicle_id
       FROM public.parking_slots;`
    )
  ]);
  const { zones, summary } = computeParkingMapSummary(zoneRes.data || [], slotRes.data || []);
  res.json({
    zones,
    summary,
    nativeSql: {
      zoneSummarySql: NATIVE_SQL.PARKING_MAP_ZONE_SUMMARY,
      overallSummarySql: NATIVE_SQL.PARKING_MAP_OVERALL_SUMMARY
    }
  });
});

// 1. READ ALL ZONES
// Copy-pasteable Supabase SQL Editor query:
// SELECT id, zone_name, vehicle_type, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status FROM public.parking_zones ORDER BY created_at;
router.get('/zones', async (req, res) => {
  let data = null;
  try {
    const resDb = await runSql(
      req.db,
      `SELECT id, zone_name, vehicle_type, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status
       FROM public.parking_zones
       ORDER BY created_at;`
    );
    if (resDb.error) throw resDb.error;
    data = resDb.data;
  } catch {
    const fallback = await runSql(
      req.db,
      `SELECT id, zone_name, vehicle_type, total_capacity, current_occupancy
       FROM public.parking_zones
       ORDER BY created_at;`
    );
    data = fallback.data;
  }

  const enriched = (data || []).map((z) => {
    const cached = zoneInfraCache.get(String(z.id)) || zoneInfraCache.get(z.zone_name) || {};
    return {
      ...z,
      drainage_status: z.drainage_status || cached.drainage_status || 'Hoạt động tốt • Bơm chống ngập 3 cấp (Khô ráo 100%)',
      sensor_status: z.sensor_status || cached.sensor_status || 'Hoạt động • Cảm biến siêu âm IoT từng ô',
      cctv_coverage: z.cctv_coverage || cached.cctv_coverage || 'Camera AI 4K góc rộng 24/7',
      lighting_status: z.lighting_status || cached.lighting_status || 'Đèn LED cảm ứng & Thông gió Jetfan'
    };
  });

  res.json(enriched);
});

// 2. READ ALL SLOTS (with bound vehicle details)
// Copy-pasteable Supabase SQL Editor query:
// SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, v.id, v.plate, v.type, v.brand, v.model FROM public.parking_slots s LEFT JOIN public.vehicles v ON v.id = s.vehicle_id;
router.get('/slots', async (req, res) => {
  const { data, error } = await runSql(
    req.db,
    `SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, v.id, v.plate, v.type, v.brand, v.model
     FROM public.parking_slots s
     LEFT JOIN public.vehicles v ON v.id = s.vehicle_id;`
  );
  if (error) {
    const fallback = await runSql(
      req.db,
      `SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, v.plate, v.type
       FROM public.parking_slots s
       LEFT JOIN public.vehicles v ON v.id = s.vehicle_id;`
    );
    if (fallback.error) throw fallback.error;
    return res.json(fallback.data || []);
  }
  res.json(data || []);
});

// 3. READ ALL REGISTERED VEHICLES (For Admin 1 Slot = 1 Xe assignment dropdown)
// Copy-pasteable Supabase SQL Editor query:
// SELECT v.id, v.plate, v.type, v.brand, v.model, v.user_id, p.name, p.email FROM public.vehicles v LEFT JOIN public.profiles p ON p.id = v.user_id;
router.get('/vehicles-list', async (req, res) => {
  try {
    const { data, error } = await runSql(
      req.db,
      `SELECT v.id, v.plate, v.type, v.brand, v.model, v.user_id, p.name, p.email
       FROM public.vehicles v
       LEFT JOIN public.profiles p ON p.id = v.user_id;`
    );
    if (error) throw error;
    res.json(data || []);
  } catch {
    const { data } = await runSql(
      req.db,
      `SELECT id, plate, type, user_id
       FROM public.vehicles;`
    );
    res.json(data || []);
  }
});

// 4. CREATE ZONE
// Copy-pasteable Supabase SQL Editor query:
// SELECT public.create_parking_zone('Khu A', 'Ô tô', 50);
router.post('/zones', async (req, res) => {
  const name = requireText(req.body.zone_name, 'Zone name', 80);
  const type = requireText(req.body.vehicle_type, 'Vehicle type');
  const capacity = Number(req.body.total_capacity);
  const drainage_status = req.body.drainage_status || 'Hoạt động tốt • Bơm chống ngập 3 cấp (Khô ráo 100%)';
  const sensor_status = req.body.sensor_status || 'Hoạt động • Cảm biến siêu âm IoT từng ô';
  const cctv_coverage = req.body.cctv_coverage || 'Camera AI 4K góc rộng 24/7';
  const lighting_status = req.body.lighting_status || 'Đèn LED cảm ứng & Thông gió Jetfan';

  if (!['Xe máy', 'Ô tô'].includes(type) || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    throw new HttpError(400, 'Chọn loại xe và sức chứa từ 1 đến 1000.');
  }

  await runSql(
    req.db,
    `SELECT public.create_parking_zone(${sqlVal(name)}, ${sqlVal(type)}, ${capacity});`
  );

  zoneInfraCache.set(name, { drainage_status, sensor_status, cctv_coverage, lighting_status });

  try {
    await runSql(
      req.db,
      `UPDATE public.parking_zones
       SET ${sqlSet({ drainage_status, sensor_status, cctv_coverage, lighting_status })}
       WHERE zone_name = ${sqlVal(name)};`
    );
  } catch {
    // Ignore if optional infrastructure columns are not in DB schema
  }

  res.json({ success: true });
});

// 5. UPDATE ZONE
router.put('/zones/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const zone_name = requireText(req.body.zone_name, 'Zone name', 80);
  const vehicle_type = requireText(req.body.vehicle_type, 'Vehicle type');
  const total_capacity = Number(req.body.total_capacity);

  if (!['Xe máy', 'Ô tô'].includes(vehicle_type) || !Number.isInteger(total_capacity) || total_capacity < 1 || total_capacity > 1000) {
    throw new HttpError(400, 'Loại xe phải là "Ô tô" hoặc "Xe máy" và sức chứa từ 1 đến 1000.');
  }

  const drainage_status = req.body.drainage_status || 'Hoạt động tốt';
  const sensor_status = req.body.sensor_status || 'Hoạt động';
  const cctv_coverage = req.body.cctv_coverage || 'Góc rộng 24/7';
  const lighting_status = req.body.lighting_status || 'Đèn LED cảm ứng';

  zoneInfraCache.set(String(id), { drainage_status, sensor_status, cctv_coverage, lighting_status });
  zoneInfraCache.set(zone_name, { drainage_status, sensor_status, cctv_coverage, lighting_status });

  const fullPayload = {
    zone_name,
    vehicle_type,
    total_capacity,
    drainage_status,
    sensor_status,
    cctv_coverage,
    lighting_status
  };

  const { error } = await runSql(
    req.db,
    `UPDATE public.parking_zones
     SET ${sqlSet(fullPayload)}
     WHERE id = ${sqlVal(id)};`
  );
  if (error) {
    const { error: fallbackErr } = await runSql(
      req.db,
      `UPDATE public.parking_zones
       SET ${sqlSet({ zone_name, vehicle_type, total_capacity })}
       WHERE id = ${sqlVal(id)};`
    );
    if (fallbackErr) throw fallbackErr;
  }

  res.json({ success: true, message: 'Đã cập nhật khu vực và hạ tầng kỹ thuật thành công!' });
});

// 6. DELETE ZONE
router.delete('/zones/:id', async (req, res) => {
  const id = requireId(req.params.id);
  await runSql(req.db, `SELECT public.delete_parking_zone(${sqlVal(id)});`);
  zoneInfraCache.delete(String(id));
  res.json({ success: true });
});

// 7. BATCH INITIALIZE SLOTS IN ZONE
router.post('/zones/:id/slots', async (req, res) => {
  const id = requireId(req.params.id);
  await runSql(req.db, `SELECT public.initialize_parking_slots(${sqlVal(id)});`);
  res.json({ success: true });
});

// 8. CREATE SINGLE SLOT IN ZONE
router.post('/zones/:id/slot-single', async (req, res) => {
  const zone_id = requireId(req.params.id);
  const slot_name = requireText(req.body.slot_name, 'Slot name', 40);
  const status = req.body.status || 'empty';
  if (!['empty', 'rented', 'occupied', 'maintenance'].includes(status)) {
    throw new HttpError(400, 'Trạng thái ô đỗ không hợp lệ.');
  }

  const { data, error } = await runSql(
    req.db,
    `INSERT INTO public.parking_slots ${sqlValues({ zone_id, slot_name, status, vehicle_id: null })}
     RETURNING *;`,
    { insertArray: true, single: true }
  );
  if (error) throw new HttpError(400, error.message || 'Không thể thêm ô đỗ mới.');

  res.status(201).json({ success: true, slot: data });
});

// 9. UPDATE INDIVIDUAL SLOT (Edit Name, Status, or 1 Slot = 1 Xe Vehicle Binding)
router.put('/slots/:slotId', async (req, res) => {
  const slotId = requireId(req.params.slotId);
  const slot_name = req.body.slot_name ? requireText(req.body.slot_name, 'Slot name', 40) : undefined;
  const status = req.body.status;
  const vehicle_id = req.body.vehicle_id === '' || req.body.vehicle_id === null ? null : req.body.vehicle_id;

  if (status && !['empty', 'rented', 'occupied', 'maintenance'].includes(status)) {
    throw new HttpError(400, 'Trạng thái ô đỗ không hợp lệ.');
  }

  // Enforce 1 Slot = 1 Xe constraint if assigning a vehicle
  if (vehicle_id) {
    await runSql(
      req.db,
      `UPDATE public.parking_slots
       SET vehicle_id = NULL, status = 'empty'
       WHERE vehicle_id = ${sqlVal(vehicle_id)} AND id <> ${sqlVal(slotId)};`
    );
  }

  const updateFields = {};
  if (slot_name !== undefined) updateFields.slot_name = slot_name;
  if (status !== undefined) updateFields.status = status;
  if (req.body.vehicle_id !== undefined) {
    updateFields.vehicle_id = vehicle_id;
    if (!vehicle_id && status !== 'maintenance') {
      updateFields.status = 'empty';
    } else if (vehicle_id && (!status || status === 'empty')) {
      updateFields.status = 'rented';
    }
  }

  const { data, error } = await runSql(
    req.db,
    `UPDATE public.parking_slots
     SET ${sqlSet(updateFields)}
     WHERE id = ${sqlVal(slotId)}
     RETURNING id, zone_id, slot_name, status, vehicle_id;`,
    { maybeSingle: true }
  );

  if (error) throw error;
  if (!data) throw new HttpError(404, 'Không tìm thấy vị trí đỗ.');

  res.json({ success: true, slot: data, message: 'Đã cập nhật ô đỗ thành công!' });
});

// 10. DELETE INDIVIDUAL SLOT
router.delete('/slots/:slotId', async (req, res) => {
  const slotId = requireId(req.params.slotId);
  const { error } = await runSql(
    req.db,
    `DELETE FROM public.parking_slots
     WHERE id = ${sqlVal(slotId)};`
  );
  if (error) throw error;
  res.json({ success: true, message: 'Đã xóa vị trí đỗ khỏi sơ đồ.' });
});

export default router;
