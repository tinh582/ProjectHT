import express from 'express';
import { HttpError, requireText } from '../http.js';
import {
  validateRealEmailAddress,
  issueAndSendEmailOtp,
  verifyEmailOtpCode,
  isEmailOtpVerified,
  consumeVerifiedEmail
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
    const kyc_status = id_card_front && id_card_back ? 'pending' : 'unverified';
    const profileRow = {
      id: data.user.id,
      name,
      email,
      role: 'user',
      phone,
      address,
      id_card_front,
      id_card_back,
      kyc_status,
      email_verified: Boolean(otpConfirmed || data.user.email_confirmed_at),
      privacy_accepted: true
    };

    try {
      await req.db.from('profiles').upsert(profileRow, { onConflict: 'id', ignoreDuplicates: false });
    } catch {
      await req.db.from('profiles').upsert(
        { id: data.user.id, name, email, role: 'user' },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
  }

  res.json({ session: data.session, user: data.user, email_verified: Boolean(otpConfirmed) });
});

export default router;
