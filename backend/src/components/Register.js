import express from 'express';
import { HttpError, requireText } from '../http.js';
import { userDocumentsStore } from '../supportStore.js';
import {
  validateRealEmailAddress,
  issueAndSendEmailOtp,
  verifyEmailOtpCode,
  isEmailOtpVerified,
  consumeVerifiedEmail,
  issueAndSendStaffConfirmationEmail,
  confirmStaffAccountByTokenOrOtp,
  getStaffConfirmationStatus
} from '../emailVerification.js';

const router = express.Router();

// 1. Send 6-digit OTP to verify Real Email before registration
router.post('/send-otp', async (req, res) => {
  const rawEmail = requireText(req.body.email, 'Email');
  const result = await issueAndSendEmailOtp(rawEmail);
  res.json({
    success: true,
    ...result,
    message: result.sentViaSmtp
      ? `Đã gửi mã OTP 6 chữ số tới hộp thư ${result.email}. Vui lòng kiểm tra Email (bao gồm mục Spam/Quảng cáo).`
      : `Đã tạo mã OTP xác thực cho ${result.email}.`
  });
});

// 2. Verify 6-digit OTP before submitting registration form
router.post('/verify-otp', async (req, res) => {
  const rawEmail = requireText(req.body.email, 'Email');
  const rawOtp = requireText(req.body.otp, 'OTP', 16);
  const result = verifyEmailOtpCode(rawEmail, rawOtp);
  res.json({
    success: true,
    ...result,
    message: '✓ Xác thực Email thật thành công! Bạn có thể hoàn tất đăng ký tài khoản.'
  });
});

// 3. Complete Account Registration
router.post('/', async (req, res) => {
  const rawEmail = requireText(req.body.email, 'Email');
  const email = await validateRealEmailAddress(rawEmail);
  requireText(req.body.password, 'Password', 1024);
  const password = req.body.password;
  const name = requireText(req.body.full_name, 'Full name');
  const phone = req.body.phone || null;
  const address = req.body.address || null;
  const id_card_front = req.body.id_card_front || null;
  const id_card_back = req.body.id_card_back || null;
  const driver_license_front = req.body.driver_license_front || null;
  const driver_license_back = req.body.driver_license_back || null;

  if (password.length < 8) throw new HttpError(400, 'Mật khẩu phải có ít nhất 8 ký tự.');

  if (phone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phone.replace(/\s+/g, ''))) {
    throw new HttpError(400, 'Số điện thoại không đúng định dạng Việt Nam.');
  }

  // Enforce OTP verification when registering from the client flow
  const otpConfirmed = isEmailOtpVerified(email, req.body.otp);
  if (req.body.requireOtp && !otpConfirmed) {
    throw new HttpError(
      400,
      'Vui lòng bấm "Gửi mã OTP" và xác thực mã OTP 6 chữ số gửi tới Email thật trước khi tạo tài khoản.'
    );
  }

  const { data, error } = await req.createAuthClient().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, phone, address }
    }
  });

  if (error) throw new HttpError(400, error.message);

  if (otpConfirmed) {
    consumeVerifiedEmail(email);
  }

  if (data.user && data.user.identities?.length > 0) {
    userDocumentsStore.set(data.user.id, {
      id_card_front,
      id_card_back,
      driver_license_front,
      driver_license_back
    });

    const hasAnyKyc = Boolean(id_card_front || id_card_back || driver_license_front || driver_license_back);
    const kyc_status = hasAnyKyc ? 'pending' : 'unverified';
    const profileRow = {
      id: data.user.id,
      name,
      email,
      role: 'user',
      phone,
      address,
      id_card_front,
      id_card_back,
      driver_license_front,
      driver_license_back,
      kyc_status,
      email_verified: Boolean(otpConfirmed || data.user.email_confirmed_at),
      privacy_accepted: true
    };

    try {
      await req.db.from('profiles').upsert(profileRow, { onConflict: 'id', ignoreDuplicates: false });
    } catch {
      // Fallback if driver_license columns do not exist in DB schema
      const fallbackRow = { ...profileRow };
      delete fallbackRow.driver_license_front;
      delete fallbackRow.driver_license_back;
      try {
        await req.db.from('profiles').upsert(fallbackRow, { onConflict: 'id', ignoreDuplicates: false });
      } catch {
        await req.db.from('profiles').upsert(
          { id: data.user.id, name, email, role: 'user' },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      }
    }
  }

  res.json({ session: data.session, user: data.user, email_verified: Boolean(otpConfirmed) });
});

// 4. Staff Account Email Confirmation Status Check
router.get('/staff-status', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const userId = String(req.query.userId || '').trim();
  let profile = { id: userId, email, email_verified: true };

  try {
    if (userId) {
      const { data } = await req.db
        .from('profiles')
        .select('id, name, email, role, email_verified')
        .eq('id', userId)
        .maybeSingle();
      if (data) profile = data;
    } else if (email) {
      const { data } = await req.db
        .from('profiles')
        .select('id, name, email, role, email_verified')
        .eq('email', email)
        .maybeSingle();
      if (data) profile = data;
    }
  } catch {
    // Fallback to in-memory status
  }

  const status = getStaffConfirmationStatus(profile);
  res.json({
    success: true,
    ...status
  });
});

// 5. Direct Email Link Confirmation for Staff Account (GET /api/components/Register/confirm-staff?email=...&token=...)
router.get('/confirm-staff', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const token = String(req.query.token || '').trim();
  const otp = String(req.query.otp || '').trim();

  const record = confirmStaffAccountByTokenOrOtp({ email, token, otp });

  // Sync confirmed status to profiles table
  try {
    if (record.userId) {
      await req.db.from('profiles').update({ email_verified: true }).eq('id', record.userId);
    } else if (record.email) {
      await req.db.from('profiles').update({ email_verified: true }).eq('email', record.email);
    }
  } catch {
    // Ignore if optional column missing
  }

  const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>HT Parking - Xác nhận Tài khoản Nhân viên</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="background: #ffffff; border: 2px solid #10b981; border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
    <div style="width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; color: #059669; font-size: 34px; line-height: 64px; margin: 0 auto 16px auto; font-weight: bold;">✓</div>
    <h2 style="color: #065f46; margin: 0 0 10px 0;">Đã xác nhận Email Nhân viên thành công!</h2>
    <p style="color: #334155; font-size: 14px; line-height: 1.6;">
      Tài khoản Nhân viên <b>${record.email}</b> đã được xác nhận kích hoạt và sẵn sàng sử dụng.<br/>
      Quản trị viên (Admin) hiện đã thấy trạng thái <b>"Đã xác nhận Email & Đang sử dụng"</b> trên bảng điều khiển.
    </p>
    <a href="${frontendUrl}" style="display: inline-block; margin-top: 18px; background: #059669; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 8px;">
      Mở Cổng Nhân viên HT Parking →
    </a>
  </div>
</body>
</html>`);
});

// 6. Confirm Staff Account via 6-digit OTP from Email (POST /api/components/Register/confirm-staff)
router.post('/confirm-staff', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const userId = req.body.userId || null;
  const otp = requireText(req.body.otp, 'Mã xác nhận Email (OTP)', 16);

  const record = confirmStaffAccountByTokenOrOtp({ email, userId, otp });

  try {
    if (record.userId) {
      await req.db.from('profiles').update({ email_verified: true }).eq('id', record.userId);
    } else if (record.email) {
      await req.db.from('profiles').update({ email_verified: true }).eq('email', record.email);
    }
  } catch {
    // Ignore if optional column missing
  }

  res.json({
    success: true,
    confirmed: true,
    email: record.email,
    confirmedAt: record.confirmedAt,
    message: '✓ Đã xác nhận Email thật thành công! Tài khoản Nhân viên đã chính thức kích hoạt sử dụng.'
  });
});

// 7. Resend Staff Confirmation Email (POST /api/components/Register/resend-staff-confirm)
router.post('/resend-staff-confirm', async (req, res) => {
  const email = requireText(req.body.email, 'Email');
  const userId = req.body.userId || null;
  const name = req.body.name || 'Nhân viên';

  const result = await issueAndSendStaffConfirmationEmail({ userId, email, name });
  res.json({
    success: true,
    ...result,
    message: result.sentViaSmtp
      ? `Đã gửi lại thư xác nhận kích hoạt nhân viên tới hộp thư ${result.email}.`
      : `Đã tạo mới mã xác nhận kích hoạt cho nhân viên ${result.email}.`
  });
});

export default router;
