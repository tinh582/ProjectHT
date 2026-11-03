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

  // Loyalty calculation for existing customers on fixed slots
  const isReturningCustomer = Boolean(status.latestTransaction);
  const loyaltyPolicy = {
    isEligible: isReturningCustomer,
    tierName: isReturningCustomer ? 'Khách hàng Thân thiết (Chỗ đỗ cố định)' : 'Khách hàng Mới',
    baseDiscountPercent: isReturningCustomer ? 10 : 0,
    bonusDays: isReturningCustomer ? 3 : 0,
    tiers: [
      { months: 1, label: 'Gia hạn cố định 1 tháng', discountPercent: isReturningCustomer ? 10 : 0, bonusDays: isReturningCustomer ? 3 : 0 },
      { months: 3, label: 'Gắn bó cố định 3 tháng', discountPercent: 15, bonusDays: 7 },
      { months: 6, label: 'Gắn bó cố định 6 tháng (VIP)', discountPercent: 20, bonusDays: 15 }
    ]
  };

  if (!status.latestTransaction) {
    return res.json({
      isActive: false,
      hasPending: status.hasPending,
      expiryDate: null,
      loyaltyPolicy
    });
  }
  res.json({
    ...status.latestTransaction,
    isActive: status.isActive,
    hasPending: status.hasPending,
    expiryDate: status.expiryDate,
    loyaltyPolicy
  });
});

router.post('/pay', async (req, res) => {
  const planId = requireId(req.body.planId);
  const proofImage = req.body.proofImage || null;
  const selectedSlotId = req.body.selectedSlotId || null;
  const vehicleId = req.body.vehicleId || null;
  const fixedMonths = Math.max(1, Math.min(12, Number(req.body.fixedMonths || 1)));
  const applyLoyalty = Boolean(req.body.applyLoyalty);

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
      message: 'Yêu cầu thanh toán và giữ chỗ cố định đã được ghi nhận. Vui lòng gửi biên lai chuyển khoản.',
    });
  }

  const { data: plan } = await req.db.from('pricing_configs').select('*').eq('id', planId).maybeSingle();
  const basePrice = plan?.price || result?.amount || 0;
  const planName = plan?.plan_type || 'Gói thuê';

  // Calculate loyalty discount & bonus days for existing customers on fixed terms
  let discountPercent = 0;
  let bonusDays = 0;
  if (fixedMonths >= 6) {
    discountPercent = 20;
    bonusDays = 15;
  } else if (fixedMonths >= 3) {
    discountPercent = 15;
    bonusDays = 7;
  } else if (applyLoyalty) {
    discountPercent = 10;
    bonusDays = 3;
  }

  const totalRaw = basePrice * fixedMonths;
  const discountedPrice = Math.round(totalRaw * (1 - discountPercent / 100));

  // Verify against basePrice OR discountedPrice so both standard and loyalty receipts pass AI OCR
  let aiResult = verifyPaymentReceipt(proofImage, basePrice, req.user.id);
  if (!aiResult.autoApproved && discountedPrice !== basePrice) {
    const loyaltyAi = verifyPaymentReceipt(proofImage, discountedPrice, req.user.id);
    if (loyaltyAi.autoApproved || loyaltyAi.matchedAmount) {
      aiResult = loyaltyAi;
    }
  }

  const isAutoCompleted = Boolean(aiResult.autoApproved);
  const now = new Date();
  const totalDays = fixedMonths * 30 + bonusDays;
  const cycleEnd = new Date(now.getTime() + totalDays * 24 * 3600 * 1000);

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
      message: `Gói cước ${planName} (${totalDays} ngày${discountPercent > 0 ? `, ưu đãi khách hàng cũ -${discountPercent}%` : ''}) của bạn đã được kích hoạt tự động.`,
    });

    await dispatchStaffAlert(req.db, {
      title: 'Giao dịch duyệt tự động qua AI',
      message: `Khách hàng ${req.user.email || req.user.id} đã được AI duyệt gói ${planName} (${basePrice} đ).`,
      priority: 'normal',
    });

    return res.json({
      success: true,
      status: 'completed',
      autoVerified: true,
      transaction: txData,
      loyaltyApplied: { discountPercent, bonusDays, totalDays, discountedPrice },
      message: `Giao dịch đã được duyệt tự động bởi AI!${discountPercent > 0 ? ` (Áp dụng ưu đãi khách hàng cũ -${discountPercent}% & tặng +${bonusDays} ngày)` : ''}`,
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
      loyaltyApplied: { discountPercent, bonusDays, totalDays, discountedPrice },
      message: 'Đã gửi chứng từ thanh toán! Nhân viên đang kiểm tra và kích hoạt gói cho bạn.',
    });
  }
});

export default router;
