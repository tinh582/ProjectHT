import express from 'express';
import { requireSelf } from '../../auth.js';
import { requireId } from '../../http.js';
import { getSubscriptionStatus } from '../../subscription.js';
import { verifyPaymentReceipt } from '../../paymentAi.js';
import { dispatchStaffAlert } from '../../notifications.js';
import { runSql, sqlVal, sqlSet, sqlValues } from '../../nativeSql.js';

const router = express.Router();

// Copy-pasteable Supabase SQL Editor query:
// SELECT id, plan_type, price FROM public.pricing_configs ORDER BY price;
router.get('/pricing', async (req, res) => {
  const { data, error } = await runSql(
    req.db,
    `SELECT id, plan_type, price
     FROM public.pricing_configs
     ORDER BY price;`
  );
  if (error) throw error;
  res.json(data || []);
});

router.get('/subscription/:userId', async (req, res) => {
  requireSelf(req, req.params.userId);
  const status = await getSubscriptionStatus(req.db, req.user.id);

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

// Copy-pasteable Supabase SQL Editor query:
// SELECT public.request_parking_payment('<USER_UUID>', '<PLAN_UUID>');
router.post('/pay', async (req, res) => {
  const planId = requireId(req.body.planId);
  const proofImage = req.body.proofImage || null;
  const selectedSlotId = req.body.selectedSlotId || null;
  const vehicleId = req.body.vehicleId || null;
  const fixedMonths = Math.max(1, Math.min(12, Number(req.body.fixedMonths || 1)));
  const applyLoyalty = Boolean(req.body.applyLoyalty);

  const { data: result } = await runSql(
    req.db,
    `SELECT public.request_parking_payment(${sqlVal(req.user.id)}, ${sqlVal(planId)});`
  );

  if (selectedSlotId && vehicleId) {
    try {
      await runSql(
        req.db,
        `SELECT public.reserve_parking_slot(${sqlVal(req.user.id)}, ${sqlVal(String(vehicleId))}, ${sqlVal(String(selectedSlotId))});`
      );
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

  const { data: plan } = await runSql(
    req.db,
    `SELECT *
     FROM public.pricing_configs
     WHERE id = ${sqlVal(planId)}
     LIMIT 1;`,
    { maybeSingle: true }
  );
  const basePrice = plan?.price || result?.amount || 0;
  const planName = plan?.plan_type || 'Gói thuê';

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
      const { data: updated } = await runSql(
        req.db,
        `UPDATE public.transactions
         SET ${sqlSet({
           status: 'completed',
           confirmed_at: now.toISOString(),
           cycle_start: now.toISOString(),
           cycle_end: cycleEnd.toISOString(),
           payment_proof: proofImage,
           auto_verified: true,
           verified_by: 'AI_OCR_ENGINE',
           ai_ocr_result: aiResult
         })}
         WHERE id = ${sqlVal(result.id)}
         RETURNING *;`,
        { maybeSingle: true }
      );
      if (updated) txData = updated;
    } catch {
      const { data: fallback } = await runSql(
        req.db,
        `UPDATE public.transactions
         SET ${sqlSet({ status: 'completed', confirmed_at: now.toISOString() })}
         WHERE id = ${sqlVal(result.id)}
         RETURNING *;`,
        { maybeSingle: true }
      );
      if (fallback) txData = fallback;
    }

    await runSql(
      req.db,
      `INSERT INTO public.notifications ${sqlValues({
        user_id: req.user.id,
        title: 'Thanh toán thành công (Tự động)',
        message: `Gói cước ${planName} (${totalDays} ngày${discountPercent > 0 ? `, ưu đãi khách hàng cũ -${discountPercent}%` : ''}) của bạn đã được kích hoạt tự động.`
      })};`
    );

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
      await runSql(
        req.db,
        `UPDATE public.transactions
         SET ${sqlSet({
           payment_proof: proofImage,
           auto_verified: false,
           ai_ocr_result: aiResult
         })}
         WHERE id = ${sqlVal(result.id)};`
      );
    } catch {
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
