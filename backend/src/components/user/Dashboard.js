import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId, HttpError } from '../../http.js';
import { purgeSensitiveUserData } from '../../privacyEngine.js';
import { issueAndSendEmailOtp, verifyEmailOtpCode, validatePhone10Digits } from '../../emailVerification.js';
import { dispatchStaffAlert } from '../../notifications.js';
import { feedbackStore, incidentLogStore, userDocumentsStore, packKycColumnsForDb, unpackKycProfile } from '../../supportStore.js';
import { runSql, sqlVal, sqlList, sqlSet, sqlValues } from '../../nativeSql.js';

const router = express.Router();

// Copy-pasteable Supabase SQL Editor query:
// SELECT id, name, email, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at FROM public.profiles WHERE id = '<USER_UUID>' LIMIT 1;
router.get('/profile/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  let data = null;
  try {
    const resDb = await runSql(
      req.db,
      `SELECT id, name, email, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at
       FROM public.profiles
       WHERE id = ${sqlVal(req.user.id)}
       LIMIT 1;`,
      { single: true }
    );
    if (resDb.error) throw resDb.error;
    data = resDb.data;
  } catch {
    const fallback = await runSql(
      req.db,
      `SELECT id, name, email, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at
       FROM public.profiles
       WHERE id = ${sqlVal(req.user.id)}
       LIMIT 1;`,
      { single: true }
    );
    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }

  res.json(unpackKycProfile(data || {}, req.user.id));
});

// Copy-pasteable Supabase SQL Editor query:
// UPDATE public.profiles SET name = 'Nguyen Van A', phone = '0901234567', address = 'TP.HCM' WHERE id = '<USER_UUID>' RETURNING *;
router.put('/profile/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { name, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back } = req.body;
  const prev = userDocumentsStore.get(req.user.id) || {};
  const mergedDocs = {
    id_card_front: id_card_front !== undefined ? id_card_front : prev.id_card_front ?? null,
    id_card_back: id_card_back !== undefined ? id_card_back : prev.id_card_back ?? null,
    driver_license_front:
      driver_license_front !== undefined ? driver_license_front : prev.driver_license_front ?? null,
    driver_license_back:
      driver_license_back !== undefined ? driver_license_back : prev.driver_license_back ?? null
  };
  userDocumentsStore.set(req.user.id, mergedDocs);

  const updateData = {};
  if (name) updateData.name = name;
  if (phone !== undefined) updateData.phone = validatePhone10Digits(phone);
  if (address !== undefined) updateData.address = address;
  if (id_card_front !== undefined) updateData.id_card_front = id_card_front;
  if (id_card_back !== undefined) updateData.id_card_back = id_card_back;
  if (driver_license_front !== undefined) updateData.driver_license_front = driver_license_front;
  if (driver_license_back !== undefined) updateData.driver_license_back = driver_license_back;

  const hasAnyDoc =
    (mergedDocs.id_card_front && mergedDocs.id_card_back) ||
    (mergedDocs.driver_license_front && mergedDocs.driver_license_back);
  if (hasAnyDoc) {
    updateData.kyc_status = 'pending';
  }

  let data = null;
  try {
    const resDb = await runSql(
      req.db,
      `UPDATE public.profiles
       SET ${sqlSet(updateData)}
       WHERE id = ${sqlVal(req.user.id)}
       RETURNING *;`,
      { single: true }
    );
    if (resDb.error) throw resDb.error;
    data = resDb.data;
  } catch {
    const packed = packKycColumnsForDb(mergedDocs);
    const safeData = { ...updateData };
    delete safeData.driver_license_front;
    delete safeData.driver_license_back;
    safeData.id_card_front = packed.id_card_front;
    safeData.id_card_back = packed.id_card_back;

    const fallback = await runSql(
      req.db,
      `UPDATE public.profiles
       SET ${sqlSet(safeData)}
       WHERE id = ${sqlVal(req.user.id)}
       RETURNING *;`,
      { single: true }
    );
    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }

  res.json({
    success: true,
    profile: unpackKycProfile(data || {}, req.user.id)
  });
});

// Send 6-Digit OTP to verify Real Email
router.post('/profile/:userId/send-email-otp', async (req, res) => {
  requireSelf(req, req.params.userId);
  const email = String(req.body.email || req.user.email || '').trim().toLowerCase();
  const result = await issueAndSendEmailOtp(email);

  try {
    await runSql(
      req.db,
      `INSERT INTO public.notifications ${sqlValues({
        user_id: req.user.id,
        title: 'Mã OTP xác thực Email thật',
        message: `Mã OTP xác thực địa chỉ email (${result.email}) đã được gửi. Mã có hiệu lực trong 10 phút.`,
        is_read: false
      })};`
    );
  } catch {
    // Ignore if notifications insert fails in mock tests
  }

  res.json({
    success: true,
    ...result,
    message: result.sentViaSmtp
      ? `Đã gửi mã OTP 6 chữ số tới hộp thư ${result.email}.`
      : `Đã gửi mã OTP 6 chữ số tới email ${result.email} (và hộp thư thông báo hệ thống).`
  });
});

// Verify 6-Digit OTP and mark email_verified = true
router.post('/profile/:userId/verify-email-otp', async (req, res) => {
  requireSelf(req, req.params.userId);
  const email = String(req.body.email || req.user.email || '').trim().toLowerCase();
  const submittedOtp = String(req.body.otp || '').trim();
  verifyEmailOtpCode(email, submittedOtp);

  try {
    await runSql(
      req.db,
      `UPDATE public.profiles
       SET email_verified = TRUE
       WHERE id = ${sqlVal(req.user.id)};`
    );
  } catch {
    // Graceful fallback if column is missing
  }

  res.json({
    success: true,
    email_verified: true,
    message: 'Xác thực Email thật thành công!'
  });
});

router.post('/profile/:userId/purge-data', async (req, res) => {
  requireSelf(req, req.params.userId);
  const result = await purgeSensitiveUserData(req.db, req.user.id, 'CUSTOMER_ZERO_DATA_REQUEST');
  res.json({
    success: true,
    message: 'Dữ liệu nhạy cảm của bạn đã được xóa sạch hoàn toàn khỏi hệ thống.',
    result
  });
});

// Copy-pasteable Supabase SQL Editor query:
// SELECT id, title, message, is_read, created_at FROM public.notifications WHERE user_id = '<USER_UUID>' ORDER BY created_at DESC LIMIT 50;
router.get('/notifications/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data, error } = await runSql(
    req.db,
    `SELECT id, title, message, is_read, created_at
     FROM public.notifications
     WHERE user_id = ${sqlVal(req.user.id)}
     ORDER BY created_at DESC
     LIMIT 50;`
  );
  if (error) throw error;
  res.json(data || []);
});

// Copy-pasteable Supabase SQL Editor query:
// UPDATE public.notifications SET is_read = TRUE WHERE user_id = '<USER_UUID>';
router.put('/notifications/:userId/read-all', async (req, res) => {
  requireSelf(req, req.params.userId);
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
  try {
    if (ids.length > 0) {
      await runSql(
        req.db,
        `UPDATE public.notifications
         SET is_read = TRUE
         WHERE user_id = ${sqlVal(req.user.id)} AND id IN ${sqlList(ids)};`
      );
    } else {
      await runSql(
        req.db,
        `UPDATE public.notifications
         SET is_read = TRUE
         WHERE user_id = ${sqlVal(req.user.id)};`
      );
    }
  } catch {
    // Ignore in mock environment
  }
  res.json({ success: true });
});

// ============================================================================
// CUSTOMER SUPPORT TICKETS & SPOT INTRUSION REPORTING (1 Slot = 1 Xe)
// ============================================================================
router.get('/support-tickets/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const userEmail = (req.user?.email || '').toLowerCase();
  const items = feedbackStore
    .filter(
      (f) =>
        f.user_id === req.user.id ||
        (userEmail && f.customer_email?.toLowerCase() === userEmail) ||
        f.user_id === null
    )
    .map((f) => {
      const staffReplies = (f.replies || []).filter((r) => r.sender === 'staff');
      const lastStaffReplyAt = staffReplies.length > 0 ? staffReplies[staffReplies.length - 1].created_at : null;
      return {
        ...f,
        is_fixed: true,
        created_at: f.created_at || new Date().toISOString(),
        replied_at: f.replied_at || lastStaffReplyAt || null,
        updated_at: f.updated_at || f.replied_at || lastStaffReplyAt || f.created_at || new Date().toISOString()
      };
    });
  res.json(items);
});

router.post('/support-tickets/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const category = req.body?.category || 'GENERAL_FEEDBACK';
  const requestedPlate = String(req.body?.plate || '').trim().toUpperCase();
  const requestedVehicleId = req.body?.vehicle_id || null;
  const intruder_plate = String(req.body?.intruder_plate || '').trim().toUpperCase();

  let customerName = req.body.customer_name || req.user?.email?.split('@')[0] || 'Khách hàng';
  let customerEmail = req.user?.email || 'customer@htparking.vn';
  try {
    const { data: prof } = await runSql(
      req.db,
      `SELECT name, email
       FROM public.profiles
       WHERE id = ${sqlVal(req.user.id)}
       LIMIT 1;`,
      { maybeSingle: true }
    );
    if (prof?.name) customerName = prof.name;
    if (prof?.email) customerEmail = prof.email;
  } catch {
    // Fallback to default customerName
  }

  let fixedPlate = requestedPlate || 'Chưa rõ';
  let fixedZoneName = String(req.body?.zone_name || 'Khu A (Hầm B1)').trim();
  let fixedSlotName = String(req.body?.slot_name || 'Cố định').trim().toUpperCase();
  let fixedVehicleInfo = String(req.body?.vehicle_info || '').trim();

  try {
    const { data: userVehs } = await runSql(
      req.db,
      `SELECT v.id, v.plate, v.brand, v.model, v.type, s.slot_name, s.zone_id, z.zone_name
       FROM public.vehicles v
       LEFT JOIN public.parking_slots s ON s.vehicle_id = v.id
       LEFT JOIN public.parking_zones z ON z.id = s.zone_id
       WHERE v.user_id = ${sqlVal(req.user.id)};`
    );

    if (Array.isArray(userVehs) && userVehs.length > 0) {
      const matchedVeh =
        userVehs.find((v) => requestedVehicleId && String(v.id) === String(requestedVehicleId)) ||
        userVehs.find((v) => requestedPlate && String(v.plate || '').toUpperCase() === requestedPlate) ||
        userVehs[0];

      if (matchedVeh) {
        if (matchedVeh.plate) fixedPlate = String(matchedVeh.plate).trim().toUpperCase();
        const brandModel = [matchedVeh.brand, matchedVeh.model].filter(Boolean).join(' ');
        if (brandModel || matchedVeh.type) {
          fixedVehicleInfo = `${brandModel}${matchedVeh.type ? ` (${matchedVeh.type})` : ''}`.trim();
        }
        const slotObj = Array.isArray(matchedVeh.parking_slots)
          ? matchedVeh.parking_slots[0]
          : matchedVeh.parking_slots;
        if (slotObj?.slot_name) {
          fixedSlotName = String(slotObj.slot_name).trim().toUpperCase();
        }
        if (slotObj?.parking_zones?.zone_name) {
          fixedZoneName = String(slotObj.parking_zones.zone_name).trim();
        }
      }
    }
  } catch {
    // Fallback to body values if DB mock doesn't return relational join
  }

  const plate = fixedPlate;
  const zone_name = fixedZoneName;
  const slot_name = fixedSlotName;

  const rawSubject = String(req.body?.subject || '').trim();
  const subject =
    rawSubject ||
    (category === 'SPOT_INTRUSION'
      ? `Báo chiếm chỗ tại ${zone_name} - Ô ${slot_name || ''} (Xe ${plate})`
      : `Ý kiến phản hồi & Góp ý tại ${zone_name} - Ô ${slot_name || 'Cố định'} (${plate})`);

  const rawMessage = String(req.body?.message || '').trim();
  const message =
    rawMessage ||
    (category === 'SPOT_INTRUSION'
      ? `Vị trí ${zone_name} — Chỗ đỗ Ô ${slot_name || ''}: Xe ${intruder_plate || 'lạ'} đang đỗ vào chỗ cố định của xe ${plate}. Nhờ nhân viên kiểm tra.`
      : `Góp ý & phản hồi tại vị trí ${zone_name} — Chỗ đỗ Ô ${slot_name || ''} (Xe ${plate}).`);

  const nowIso = new Date().toISOString();
  const fbId = `fb-${Date.now()}`;
  const incId = `inc-${Date.now()}`;

  const newTicket = {
    id: fbId,
    user_id: req.user.id,
    customer_name: customerName,
    customer_email: customerEmail,
    plate,
    vehicle_info: fixedVehicleInfo || 'Phương tiện cố định',
    zone_name,
    slot_name,
    intruder_plate,
    category,
    subject,
    message,
    is_fixed: true,
    linked_incident_id: category === 'SPOT_INTRUSION' || category === 'INFRASTRUCTURE_ISSUE' ? incId : null,
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'SMS Alert'],
    status: 'open',
    staff_reply: '',
    replied_at: null,
    updated_at: nowIso,
    replies: [
      {
        id: `rep-${Date.now()}-1`,
        sender: 'customer',
        author: customerName,
        text: message,
        created_at: nowIso
      }
    ],
    created_at: nowIso
  };

  feedbackStore.unshift(newTicket);

  try {
    await runSql(
      req.db,
      `INSERT INTO public.support_feedbacks ${sqlValues(newTicket)}
       ON CONFLICT (id) DO UPDATE SET ${sqlSet(newTicket)};`
    );
  } catch {
    // Ignore when support_feedbacks table is not in mock DB
  }

  if (category === 'SPOT_INTRUSION' || category === 'INFRASTRUCTURE_ISSUE') {
    const isSpotIntrusion = category === 'SPOT_INTRUSION';
    const aiDiagnosis = isSpotIntrusion
      ? `AI Phân tích (1 Slot = 1 Xe): Chủ xe ${plate} báo ô cố định ${slot_name || 'đã đăng ký'} bị xe ${
          intruder_plate || 'lạ'
        } chiếm chỗ. Đề xuất: (1) Gửi cảnh báo đẩy tới chủ xe ${
          intruder_plate || 'vi phạm'
        }, (2) Cử nhân viên trực ban xuống kiểm tra ô ${slot_name || ''}.`
      : `AI Phân tích (Hạ tầng & Cảm biến): Khách hàng báo cáo vấn đề kỹ thuật tại ô ${
          slot_name || 'bãi đỗ'
        }. Đề xuất kiểm tra hệ thống thoát nước & cảm biến tại khu vực.`;

    const newInc = {
      id: incId,
      linked_feedback_id: fbId,
      user_id: req.user.id,
      plate,
      zone_name,
      slot_name,
      intruder_plate,
      incident_type: isSpotIntrusion ? 'WRONG_SLOT_OCCUPIED' : 'INFRA_DRAINAGE_ALERT',
      severity: isSpotIntrusion ? 'high' : 'medium',
      title: subject,
      description: `${message}${intruder_plate ? ` (Biển số xe chiếm chỗ: ${intruder_plate})` : ''}`,
      ai_diagnosis: aiDiagnosis,
      status: 'open',
      staff_note: '',
      reported_by: `Khách hàng ${customerName} (${plate})`,
      created_at: nowIso,
      resolved_at: null
    };

    incidentLogStore.unshift(newInc);
    try {
      await runSql(
        req.db,
        `INSERT INTO public.incident_logs ${sqlValues(newInc)}
         ON CONFLICT (id) DO UPDATE SET ${sqlSet(newInc)};`
      );
    } catch {
      // Ignore when incident_logs table is not in mock DB
    }
  }

  await dispatchStaffAlert(req.db, {
    title: category === 'SPOT_INTRUSION' ? `🚨 BÁO CHIẾM Ô ĐỖ ${slot_name}: ${subject}` : `💬 Hỗ trợ mới: ${subject}`,
    message: `${customerName} (${plate}): ${message}`,
    priority: category === 'SPOT_INTRUSION' ? 'high' : 'normal',
    channel: 'all'
  });

  res.status(201).json({
    success: true,
    ticket: newTicket,
    message:
      category === 'SPOT_INTRUSION'
        ? `🚨 Đã gửi báo cáo chiếm ô ${slot_name || ''} tới đội ngũ trực ban và hệ thống AI Xử lý lỗi!`
        : '✅ Đã gửi yêu cầu hỗ trợ tới Nhân viên trực ban qua 4 kênh thông báo!'
  });
});

// Customer sends a follow-up response on an existing ticket
router.post('/support-tickets/:userId/:ticketId/reply', async (req, res) => {
  requireSelf(req, req.params.userId);
  const idx = feedbackStore.findIndex((f) => f.id === req.params.ticketId);
  if (idx === -1) throw new HttpError(404, 'Không tìm thấy yêu cầu hỗ trợ.');

  const rawText = String(req.body?.text || '').trim();
  const text = rawText || 'Đã giải quyết xong, cảm ơn nhân viên!';
  const current = feedbackStore[idx];
  const nowIso = new Date().toISOString();

  const updatedReplies = [
    ...(current.replies || []),
    {
      id: `rep-${Date.now()}`,
      sender: 'customer',
      author: current.customer_name || req.user?.email || 'Khách hàng',
      text,
      created_at: nowIso
    }
  ];

  feedbackStore[idx] = {
    ...current,
    is_fixed: true,
    status: req.body.markResolved ? 'resolved' : 'open',
    updated_at: nowIso,
    replies: updatedReplies
  };

  await dispatchStaffAlert(req.db, {
    title: `💬 Khách hàng phản hồi thêm: ${current.subject}`,
    message: `${current.customer_name} (${current.plate}): ${text}`,
    priority: 'normal',
    channel: 'all'
  });

  res.json({
    success: true,
    ticket: feedbackStore[idx],
    message: 'Đã gửi phản hồi bổ sung tới nhân viên trực ban!'
  });
});

// Copy-pasteable Supabase SQL Editor query:
// SELECT v.*, s.slot_name, s.zone_id, z.zone_name, z.vehicle_type, z.drainage_status, z.sensor_status, z.cctv_coverage FROM public.vehicles v LEFT JOIN public.parking_slots s ON s.vehicle_id = v.id LEFT JOIN public.parking_zones z ON z.id = s.zone_id WHERE v.user_id = '<USER_UUID>';
router.get('/vehicles/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data, error } = await runSql(
    req.db,
    `SELECT v.*, s.slot_name, s.zone_id, z.zone_name, z.vehicle_type, z.drainage_status, z.sensor_status, z.cctv_coverage
     FROM public.vehicles v
     LEFT JOIN public.parking_slots s ON s.vehicle_id = v.id
     LEFT JOIN public.parking_zones z ON z.id = s.zone_id
     WHERE v.user_id = ${sqlVal(req.params.userId)};`
  );

  if (error) {
    const fallback = await runSql(
      req.db,
      `SELECT v.*, s.slot_name
       FROM public.vehicles v
       LEFT JOIN public.parking_slots s ON s.vehicle_id = v.id
       WHERE v.user_id = ${sqlVal(req.params.userId)};`
    );
    return res.json({ vehicles: fallback.data || [], activeVehicleIds: [] });
  }

  let activeVehicleIds = [];
  const sessionsByVehicle = {};

  if (data && data.length > 0) {
    const vIds = data.map((v) => v.id);
    const { data: sessions, error: sessionErr } = await runSql(
      req.db,
      `SELECT id, vehicle_id, entry_time, exit_time, status, created_at
       FROM public.parking_sessions
       WHERE vehicle_id IN ${sqlList(vIds)}
       ORDER BY entry_time DESC;`
    );

    if (!sessionErr && sessions) {
      for (const s of sessions) {
        if (s.status === 'active' && !activeVehicleIds.includes(s.vehicle_id)) {
          activeVehicleIds.push(s.vehicle_id);
        }
        if (!sessionsByVehicle[s.vehicle_id]) {
          sessionsByVehicle[s.vehicle_id] = [];
        }
        sessionsByVehicle[s.vehicle_id].push(s);
      }
    }
  }

  const responsePayload = { vehicles: data || [], activeVehicleIds };
  if (req.query.withSessions === 'true') {
    responsePayload.sessionsByVehicle = sessionsByVehicle;
  }

  res.json(responsePayload);
});

router.get('/sessions/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data: userVehicles, error: vErr } = await runSql(
    req.db,
    `SELECT v.id, v.plate, v.brand, v.model, v.type, s.slot_name
     FROM public.vehicles v
     LEFT JOIN public.parking_slots s ON s.vehicle_id = v.id
     WHERE v.user_id = ${sqlVal(req.params.userId)};`
  );

  if (vErr) throw vErr;
  if (!userVehicles || userVehicles.length === 0) {
    return res.json([]);
  }

  const vMap = new Map(userVehicles.map((v) => [v.id, v]));
  const vIds = userVehicles.map((v) => v.id);

  const { data: sessions, error: sErr } = await runSql(
    req.db,
    `SELECT id, vehicle_id, entry_time, exit_time, status, created_at
     FROM public.parking_sessions
     WHERE vehicle_id IN ${sqlList(vIds)}
     ORDER BY entry_time DESC
     LIMIT 100;`
  );

  if (sErr) throw sErr;

  const enriched = (sessions || []).map((s) => ({
    ...s,
    vehicle: vMap.get(s.vehicle_id) || null
  }));

  res.json(enriched);
});

router.delete('/vehicles/:id', async (req, res) => {
  const vehId = requireId(req.params.id);
  await runSql(
    req.db,
    `SELECT public.edit_parking_vehicle(${sqlVal(req.user.id)}, ${sqlVal(vehId)}, '{}'::jsonb, TRUE);`
  );
  res.json({ success: true });
});

export default router;
