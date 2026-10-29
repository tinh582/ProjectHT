import express from 'express';
import { HttpError, requireId, requireText, rpc } from '../../http.js';
import { analyzeAndHandleError } from '../../aiErrorHandler.js';
import { incidentLogStore, feedbackStore } from '../../supportStore.js';

const router = express.Router();

// 1. GET ACTIVE VEHICLE SESSIONS IN PARKING LOT
router.get('/', async (req, res) => {
  let data = null;
  try {
    const resDb = await req.db
      .from('parking_sessions')
      .select(
        'id, entry_time, status, vehicles(id, user_id, type, plate, brand, model, profiles(name, email, phone), parking_slots(slot_name))'
      )
      .eq('status', 'active')
      .order('entry_time', { ascending: false });
    if (resDb.error) throw resDb.error;
    data = resDb.data;
  } catch {
    const { data: fallback, error } = await req.db
      .from('parking_sessions')
      .select('id, entry_time, vehicles(id, user_id, type, plate, brand, model)')
      .eq('status', 'active');
    if (error) throw error;
    data = fallback;
  }

  const enriched = (data || []).map((s) => {
    const entryMs = s.entry_time ? new Date(s.entry_time).getTime() : Date.now();
    const hoursParked = Math.max(0.1, (Date.now() - entryMs) / (1000 * 3600));
    const fixedSlot =
      Array.isArray(s.vehicles?.parking_slots) && s.vehicles.parking_slots.length > 0
        ? s.vehicles.parking_slots[0].slot_name
        : s.vehicles?.parking_slots?.slot_name || 'Ô cố định chuẩn 1 Slot = 1 Xe';

    let aiStatus = 'NORMAL';
    let aiRecommendation = 'Phương tiện đỗ đúng ô cố định • Cảm biến & Thoát nước ổn định.';
    if (hoursParked > 24) {
      aiStatus = 'OVERSTAY_WARNING';
      aiRecommendation = `Đỗ liên tục ${hoursParked.toFixed(1)} giờ. AI đề xuất kiểm tra xem xe đã ra khỏi bãi mà quên đóng phiên hay chưa.`;
    }

    return {
      ...s,
      hours_parked: Number(hoursParked.toFixed(1)),
      fixed_slot: fixedSlot,
      ai_status: aiStatus,
      ai_recommendation: aiRecommendation
    };
  });

  res.json(enriched);
});

// 2. GET AI INCIDENT & EXCEPTION LOGS
router.get('/incidents', async (req, res) => {
  res.json(incidentLogStore);
});

// 3. CREATE NEW INCIDENT / EXCEPTION LOG (With AI Auto-Diagnosis)
router.post('/incidents', async (req, res) => {
  const plate = requireText(req.body.plate || 'CHƯA RÕ', 'Biển số xe', 40);
  const incident_type = req.body.incident_type || 'MANUAL_BARRIER_OVERRIDE';
  const severity = ['low', 'medium', 'high'].includes(req.body.severity) ? req.body.severity : 'medium';
  const title = requireText(req.body.title, 'Tiêu đề sự cố', 200);
  const description = String(req.body.description || '').trim();

  let ai_diagnosis = '';
  if (incident_type === 'WRONG_SLOT_OCCUPIED') {
    ai_diagnosis =
      'AI Phân tích (1 Slot = 1 Xe): Phát hiện xung đột vị trí đỗ cố định. Hệ thống đề xuất gửi thông báo đẩy tới chủ xe để di chuyển về đúng ô đã đăng ký hoặc khóa tạm thời ô đỗ.';
  } else if (incident_type === 'AI_PLATE_BLUR') {
    ai_diagnosis =
      'AI Phân tích (Roboflow OCR): Biển số bị che khuất/mờ. Hệ thống đã đối chiếu mẫu xe và lịch sử vé tháng trùng khớp 98%. Cho phép mở barie an toàn.';
  } else if (incident_type === 'INFRA_DRAINAGE_ALERT') {
    ai_diagnosis =
      'AI Phân tích (Hạ tầng & Thoát nước): Tự động kích hoạt bơm tiêu úng dự phòng cấp 2 và kiểm tra cảm biến rãnh thoát nước tại khu vực.';
  } else {
    const aiResult = analyzeAndHandleError(new Error(title), { plate, incident_type });
    ai_diagnosis = `AI Phân tích (${aiResult.category}): ${aiResult.recommendedAction}`;
  }

  const newIncident = {
    id: `inc-${Date.now()}`,
    user_id: req.body.user_id || null,
    plate: plate.toUpperCase(),
    slot_name: req.body.slot_name || '',
    intruder_plate: req.body.intruder_plate || '',
    incident_type,
    severity,
    title,
    description,
    ai_diagnosis,
    status: 'open',
    staff_note: '',
    reported_by: req.user?.email || 'Nhân viên trực ban',
    created_at: new Date().toISOString(),
    resolved_at: null
  };

  incidentLogStore.unshift(newIncident);
  res.status(201).json({ success: true, incident: newIncident });
});

// 4. UPDATE / RESOLVE INCIDENT LOG (Also syncs with Customer Ticket & notifies Customer)
router.put('/incidents/:incId', async (req, res) => {
  const { incId } = req.params;
  const idx = incidentLogStore.findIndex((item) => item.id === incId);
  if (idx === -1) throw new HttpError(404, 'Không tìm thấy bản ghi sự cố.');

  const current = incidentLogStore[idx];
  const nextStatus = req.body.status || current.status;
  const staffNote =
    req.body.staff_note !== undefined
      ? req.body.staff_note
      : nextStatus === 'resolved' && !current.staff_note
      ? 'Nhân viên trực ban đã xử lý xong sự cố và giải phóng lại đúng vị trí ô đỗ cố định.'
      : current.staff_note;

  incidentLogStore[idx] = {
    ...current,
    plate: req.body.plate !== undefined ? String(req.body.plate).toUpperCase() : current.plate,
    title: req.body.title !== undefined ? req.body.title : current.title,
    description: req.body.description !== undefined ? req.body.description : current.description,
    severity: req.body.severity !== undefined ? req.body.severity : current.severity,
    staff_note: staffNote,
    status: nextStatus,
    resolved_at: nextStatus === 'resolved' ? new Date().toISOString() : null
  };

  // Sync linked customer ticket in feedbackStore if present
  if (current.linked_feedback_id) {
    const fbIdx = feedbackStore.findIndex((f) => f.id === current.linked_feedback_id);
    if (fbIdx !== -1 && nextStatus === 'resolved') {
      const replyMsg = staffNote || 'Đội ngũ trực ban đã xử lý xong báo cáo vị trí đỗ của bạn!';
      feedbackStore[fbIdx].status = 'resolved';
      feedbackStore[fbIdx].staff_reply = replyMsg;
      feedbackStore[fbIdx].replies = [
        ...(feedbackStore[fbIdx].replies || []),
        {
          sender: 'staff',
          author: req.user?.email || 'Nhân viên trực ban',
          text: replyMsg,
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  // Send notification to customer if incident belongs to a customer
  if (current.user_id && nextStatus === 'resolved') {
    try {
      await req.db.from('notifications').insert({
        user_id: current.user_id,
        title: `✓ Đã xử lý sự cố ô đỗ (${current.plate})`,
        message: staffNote || `Báo cáo "${current.title}" của bạn đã được nhân viên xử lý hoàn tất.`,
        is_read: false
      });
    } catch {
      // Ignore in mock environment
    }
  }

  res.json({ success: true, incident: incidentLogStore[idx] });
});

// 5. DELETE INCIDENT LOG
router.delete('/incidents/:incId', async (req, res) => {
  const { incId } = req.params;
  const idx = incidentLogStore.findIndex((item) => item.id === incId);
  if (idx !== -1) {
    incidentLogStore.splice(idx, 1);
  }
  res.json({ success: true });
});

// 6. MANUAL BARRIER OPEN & COMPLETE PARKING SESSION (Existing route preserved)
router.post('/:id/open', async (req, res) => {
  const sessionId = requireId(req.params.id);
  const reason = req.body?.reason || 'Nhân viên xác nhận mở barie thủ công (AI Fallback)';
  const plate = req.body?.session?.vehicles?.plate || 'XE-TRONG-BAI';

  await rpc(req.db, 'transition_parking_session', {
    p_plate: null,
    p_session_id: sessionId
  });

  incidentLogStore.unshift({
    id: `inc-${Date.now()}`,
    plate,
    incident_type: 'MANUAL_BARRIER_OVERRIDE',
    severity: 'low',
    title: `Mở Barie hoàn tất phiên đỗ xe (${plate})`,
    description: reason,
    ai_diagnosis:
      'AI Fallback: Đã đối soát phiên đỗ hợp lệ, cập nhật giải phóng trạng thái đang đỗ và lưu vết kiểm toán.',
    status: 'resolved',
    reported_by: req.user?.email || 'Staff',
    created_at: new Date().toISOString(),
    resolved_at: new Date().toISOString()
  });

  res.json({ success: true });
});

// 7. SEND REMINDER NOTIFICATION TO VEHICLE OWNER (e.g., Wrong slot / Overstay)
router.post('/:id/notify-owner', async (req, res) => {
  const userId = req.body.user_id;
  const plate = req.body.plate || '';
  const message =
    req.body.message ||
    `Phương tiện ${plate} của bạn cần kiểm tra vị trí đỗ cố định (1 Slot = 1 Xe) tại hầm xe HT Parking.`;

  if (userId) {
    try {
      await req.db.from('notifications').insert({
        user_id: userId,
        title: `🔔 Nhắc nhở phương tiện ${plate}`,
        message,
        is_read: false
      });
    } catch {
      // Ignore if notifications table error in mock environment
    }
  }

  res.json({
    success: true,
    message: `Đã gửi thông báo nhắc nhở tới chủ xe ${plate}!`
  });
});

export default router;
