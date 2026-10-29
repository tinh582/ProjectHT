import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId, rpc, HttpError } from '../../http.js';
import { getSubscriptionStatus } from '../../subscription.js';
import { verifyPaymentReceipt } from '../../paymentAi.js';
import { dispatchStaffAlert } from '../../notifications.js';

const router = express.Router();

router.get('/pricing', async (req, res) => {
  const { data, error } = await req.db.from('pricing_configs').select('id, plan_type, price').order('price');
  if (error) throw error;
  res.json(data || []);
});

router.get('/subscription/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const status = await getSubscriptionStatus(req.db, req.user.id);
  if (!status.latestTransaction) {
    return res.json({
      isActive: false,
      hasPending: status.hasPending,
      expiryDate: null,
    });
  }
  res.json({
    ...status.latestTransaction,
    isActive: status.isActive,
    hasPending: status.hasPending,
    expiryDate: status.expiryDate,
  });
});

router.post('/pay', async (req, res) => {
  const planId = requireId(req.body.planId);
  const proofImage = req.body.proofImage || null;
  const selectedSlotId = req.body.selectedSlotId || null;
  const vehicleId = req.body.vehicleId || null;

  const result = await rpc(req.db, 'request_parking_payment', {
    p_user_id: req.user.id,
    p_plan_id: planId,
  });

  if (selectedSlotId && vehicleId) {
    try {
      await rpc(req.db, 'reserve_parking_slot', {
        p_user_id: req.user.id,
        p_vehicle_id: String(vehicleId),
        p_slot_id: String(selectedSlotId),
      });
    } catch (slotErr) {
      console.warn('Slot reservation fallback:', slotErr?.message);
    }
  }

  if (!proofImage) {
    return res.json({
      success: true,
      status: 'pending',
      transaction: result,
      message: 'Yêu cầu thanh toán và giữ chỗ đã được ghi nhận. Vui lòng gửi biên lai chuyển khoản.',
    });
  }

  const { data: plan } = await req.db.from('pricing_configs').select('*').eq('id', planId).maybeSingle();
  const planPrice = plan?.price || result?.amount || 0;
  const planName = plan?.plan_type || 'Gói thuê';

  let aiResult = verifyPaymentReceipt(proofImage, planPrice, req.user.id);
  const isAutoCompleted = Boolean(aiResult.autoApproved);
  const now = new Date();
  const cycleEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  if (isAutoCompleted) {
    let txData = { ...result, status: 'completed' };
    try {
      const { data: updated } = await req.db.from('transactions').update({
        status: 'completed',
        confirmed_at: now.toISOString(),
        cycle_start: now.toISOString(),
        cycle_end: cycleEnd.toISOString(),
        payment_proof: proofImage,
        auto_verified: true,
        verified_by: 'AI_OCR_ENGINE',
        ai_ocr_result: aiResult,
      }).eq('id', result.id).select().maybeSingle();
      if (updated) txData = updated;
    } catch (txErr) {
      const { data: fallback } = await req.db.from('transactions').update({
        status: 'completed',
        confirmed_at: now.toISOString(),
      }).eq('id', result.id).select().maybeSingle();
      if (fallback) txData = fallback;
    }

    await req.db.from('notifications').insert({
      user_id: req.user.id,
      title: 'Thanh toán thành công (Tự động)',
      message: `Gói cước ${planName} của bạn đã được hệ thống AI kích hoạt tự động.`,
    });

    await dispatchStaffAlert(req.db, {
      title: 'Giao dịch duyệt tự động qua AI',
      message: `Khách hàng ${req.user.email || req.user.id} đã được AI duyệt gói ${planName} (${planPrice} đ).`,
      priority: 'normal',
    });

    return res.json({
      success: true,
      status: 'completed',
      autoVerified: true,
      transaction: txData,
      message: 'Giao dịch đã được duyệt tự động thành công bởi hệ thống AI!',
    });
  } else {
    try {
      await req.db.from('transactions').update({
        payment_proof: proofImage,
        auto_verified: false,
        ai_ocr_result: aiResult,
      }).eq('id', result.id);
    } catch (e) {
      // fallback
    }

    await dispatchStaffAlert(req.db, {
      title: 'Yêu cầu thanh toán mới cần duyệt',
      message: `Khách hàng ${req.user.email || req.user.id} vừa gửi biên lai thanh toán gói ${planName}.`,
      priority: 'high',
    });

    return res.json({
      success: true,
      status: 'pending',
      autoVerified: false,
      transaction: result,
      message: 'Đã gửi chứng từ thanh toán! Nhân viên đang kiểm tra và kích hoạt gói cho bạn.',
    });
  }
});

export default router;
