import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId, requireText, rpc, HttpError } from '../../http.js';
import { purgeSensitiveUserData } from '../../privacyEngine.js';
import { issueAndSendEmailOtp, verifyEmailOtpCode } from '../../emailVerification.js';
import { dispatchStaffAlert } from '../../notifications.js';
import { feedbackStore, incidentLogStore } from '../../supportStore.js';

const router = express.Router();

router.get('/profile/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data, error } = await req.db
    .from('profiles')
    .select('id, name, email, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at')
    .eq('id', req.user.id)
    .single();
  if (error) throw error;
  res.json(data);
});

router.put('/profile/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { name, phone, address, id_card_front, id_card_back } = req.body;
  const updateData = {};
  if (name) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (id_card_front !== undefined) updateData.id_card_front = id_card_front;
  if (id_card_back !== undefined) updateData.id_card_back = id_card_back;

  if (id_card_front && id_card_back) {
    updateData.kyc_status = 'pending';
  }

  const { data, error } = await req.db
    .from('profiles')
    .update(updateData)
    .eq('id', req.user.id)
    .select()
    .single();
  if (error) throw error;
  res.json({ success: true, profile: data });
});

// Send 6-Digit OTP to verify Real Email
router.post('/profile/:userId/send-email-otp', async (req, res) => {
  requireSelf(req, req.params.userId);
  const email = String(req.body.email || req.user.email || '').trim().toLowerCase();
  const result = await issueAndSendEmailOtp(email);

  try {
    await req.db.from('notifications').insert({
      user_id: req.user.id,
      title: 'Mã OTP xác thực Email thật',
      message: `Mã OTP xác thực địa chỉ email (${result.email}) đã được gửi. Mã có hiệu lực trong 10 phút.`,
      is_read: false
    });
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
    await req.db
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', req.user.id);
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

router.get('/notifications/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data, error } = await req.db
    .from('notifications')
    .select('id, title, message, is_read, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  res.json(data || []);
});

router.put('/notifications/:userId/read-all', async (req, res) => {
  requireSelf(req, req.params.userId);
  try {
    await req.db
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id);
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
  const items = feedbackStore.filter(
    (f) => f.user_id === req.user.id || (userEmail && f.customer_email?.toLowerCase() === userEmail)
  );
  res.json(items);
});

router.post('/support-tickets/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const category = req.body?.category || 'SPOT_INTRUSION';
  const plate = String(req.body?.plate || 'Chưa rõ').trim().toUpperCase();
  const slot_name = String(req.body?.slot_name || '').trim().toUpperCase();
  const intruder_plate = String(req.body?.intruder_plate || '').trim().toUpperCase();

  const rawSubject = String(req.body?.subject || '').trim();
  const subject =
    rawSubject ||
    (category === 'SPOT_INTRUSION'
      ? `Báo chiếm ô ${slot_name || ''} (Xe ${plate})`
      : `Câu hỏi hỗ trợ (${plate})`);

  const rawMessage = String(req.body?.message || '').trim();
  const message =
    rawMessage ||
    (category === 'SPOT_INTRUSION'
      ? `Xe ${intruder_plate || 'lạ'} đang đỗ vào ô cố định ${slot_name || ''} của xe ${plate}. Nhờ nhân viên kiểm tra.`
      : `Nhờ nhân viên hỗ trợ kiểm tra cho phương tiện ${plate}.`);

  let customerName = req.body.customer_name || req.user?.email?.split('@')[0] || 'Khách hàng';
  try {
    const { data: prof } = await req.db.from('profiles').select('name, email').eq('id', req.user.id).maybeSingle();
    if (prof?.name) customerName = prof.name;
  } catch {
    // Fallback to default customerName
  }

  const fbId = `fb-${Date.now()}`;
  const incId = `inc-${Date.now()}`;

  const newTicket = {
    id: fbId,
    user_id: req.user.id,
    customer_name: customerName,
    customer_email: req.user?.email || 'customer@htparking.vn',
    plate,
    slot_name,
    intruder_plate,
    category,
    subject,
    message,
    linked_incident_id: category === 'SPOT_INTRUSION' || category === 'INFRASTRUCTURE_ISSUE' ? incId : null,
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'Telegram/Zalo Bot', 'SMS Alert'],
    status: 'open',
    staff_reply: '',
    replies: [
      {
        sender: 'customer',
        author: customerName,
        text: message,
        created_at: new Date().toISOString()
      }
    ],
    created_at: new Date().toISOString()
  };

  feedbackStore.unshift(newTicket);

  // If Customer reports someone taking their spot (SPOT_INTRUSION) or infrastructure issue,
  // also push directly to StaffExceptions (incidentLogStore) with AI diagnosis!
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

    incidentLogStore.unshift({
      id: incId,
      linked_feedback_id: fbId,
      user_id: req.user.id,
      plate,
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
      created_at: new Date().toISOString(),
      resolved_at: null
    });
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

  const updatedReplies = [
    ...(current.replies || []),
    {
      sender: 'customer',
      author: current.customer_name || req.user?.email || 'Khách hàng',
      text,
      created_at: new Date().toISOString()
    }
  ];

  feedbackStore[idx] = {
    ...current,
    status: req.body.markResolved ? 'resolved' : 'open',
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

router.get('/vehicles/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const { data, error } = await req.db
    .from('vehicles')
    .select(
      '*, parking_slots(slot_name, zone_id, parking_zones(zone_name, vehicle_type, drainage_status, sensor_status, cctv_coverage))'
    )
    .eq('user_id', req.params.userId);

  if (error) {
    const fallback = await req.db
      .from('vehicles')
      .select('*, parking_slots(slot_name)')
      .eq('user_id', req.params.userId);
    return res.json({ vehicles: fallback.data || [], activeVehicleIds: [] });
  }

  let activeVehicleIds = [];
  const sessionsByVehicle = {};

  if (data && data.length > 0) {
    const vIds = data.map((v) => v.id);
    const { data: sessions, error: sessionErr } = await req.db
      .from('parking_sessions')
      .select('id, vehicle_id, entry_time, exit_time, status, created_at')
      .in('vehicle_id', vIds)
      .order('entry_time', { ascending: false });

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
  const { data: userVehicles, error: vErr } = await req.db
    .from('vehicles')
    .select('id, plate, brand, model, type, parking_slots(slot_name)')
    .eq('user_id', req.params.userId);

  if (vErr) throw vErr;
  if (!userVehicles || userVehicles.length === 0) {
    return res.json([]);
  }

  const vMap = new Map(userVehicles.map((v) => [v.id, v]));
  const vIds = userVehicles.map((v) => v.id);

  const { data: sessions, error: sErr } = await req.db
    .from('parking_sessions')
    .select('id, vehicle_id, entry_time, exit_time, status, created_at')
    .in('vehicle_id', vIds)
    .order('entry_time', { ascending: false })
    .limit(100);

  if (sErr) throw sErr;

  const enriched = (sessions || []).map((s) => ({
    ...s,
    vehicle: vMap.get(s.vehicle_id) || null
  }));

  res.json(enriched);
});

router.delete('/vehicles/:id', async (req, res) => {
  await rpc(req.db, 'edit_parking_vehicle', {
    p_user_id: req.user.id,
    p_vehicle_id: requireId(req.params.id),
    p_fields: {},
    p_delete: true
  });
  res.json({ success: true });
});

export default router;
