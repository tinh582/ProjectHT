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

  const { data: plan, error: planErr } = await req.db.from('pricing_configs').select('*').eq('id', planId).single();
  if (planErr || !plan) throw new HttpError(404, 'Gói cước không tồn tại.');

  let aiResult = { autoApproved: false, reason: 'Chờ nhân viên đối soát.' };
  let isAutoCompleted = false;

  if (proofImage) {
    aiResult = verifyPaymentReceipt(proofImage, plan.price, req.user.id);
    if (aiResult.autoApproved) {
      isAutoCompleted = true;
    }
  }

  const now = new Date();
  const cycleEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  let txData;
  if (isAutoCompleted) {
    const { data: newTx, error: txErr } = await req.db.from('transactions').insert({
      user_id: req.user.id,
      amount: plan.price,
      plan_name: plan.plan_type,
      status: 'completed',
      confirmed_at: now.toISOString(),
      cycle_start: now.toISOString(),
      cycle_end: cycleEnd.toISOString(),
      payment_proof: proofImage,
      auto_verified: true,
      verified_by: 'AI_OCR_ENGINE',
      ai_ocr_result: aiResult,
    }).select().single();

    if (txErr) {
      const fallback = await req.db.from('transactions').insert({
        user_id: req.user.id,
        amount: plan.price,
        plan_name: plan.plan_type,
        status: 'completed',
        confirmed_at: now.toISOString(),
      }).select().single();
      txData = fallback.data;
    } else {
      txData = newTx;
    }

    if (selectedSlotId && vehicleId) {
      try {
        await rpc(req.db, 'reserve_parking_slot', {
          p_user_id: req.user.id,
          p_vehicle_id: String(vehicleId),
          p_slot_id: String(selectedSlotId),
        });
      } catch (slotErr) {
        console.warn('Slot reservation fallback:', slotErr.message);
      }
    }

    await req.db.from('notifications').insert({
      user_id: req.user.id,
      title: 'Thanh toán thành công (Tự động)',
      message: `Gói cước ${plan.plan_type} của bạn đã được hệ thống AI kích hoạt tự động.`,
    });

    await dispatchStaffAlert(req.db, {
      title: 'Giao dịch duyệt tự động qua AI',
      message: `Khách hàng ${req.user.email} đã được AI duyệt gói ${plan.plan_type} (${plan.price} đ).`,
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
    const { data: pendingTx, error: pErr } = await req.db.from('transactions').insert({
      user_id: req.user.id,
      amount: plan.price,
      plan_name: plan.plan_type,
      status: 'pending',
      payment_proof: proofImage,
      auto_verified: false,
      ai_ocr_result: aiResult,
    }).select().single();

    if (pErr) {
      const fallback = await req.db.from('transactions').insert({
        user_id: req.user.id,
        amount: plan.price,
        plan_name: plan.plan_type,
        status: 'pending',
      }).select().single();
      txData = fallback.data;
    } else {
      txData = pendingTx;
    }

    await dispatchStaffAlert(req.db, {
      title: 'Yêu cầu thanh toán mới cần duyệt',
      message: `Khách hàng ${req.user.email} vừa gửi biên lai thanh toán gói ${plan.plan_type}.`,
      priority: 'high',
    });

    return res.json({
      success: true,
      status: 'pending',
      autoVerified: false,
      transaction: txData,
      message: 'Đã gửi chứng từ thanh toán! Nhân viên đang kiểm tra và kích hoạt gói cho bạn.',
    });
  }
});

export default router;