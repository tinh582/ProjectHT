import dns from 'node:dns/promises';
import { HttpError } from './http.js';

// In-memory store for 6-digit OTPs & pre-verified emails
// Key: normalized email -> { otp, expiresAt, verified, verifiedUntil }
const otpStore = new Map();

const BLOCKED_DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'getnada.com',
  'fake.com',
  'test.invalid'
]);

const KNOWN_VALID_DOMAINS = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'fpt.edu.vn',
  'htparking.vn',
  'example.com'
]);

export function normalizeEmail(rawEmail) {
  return String(rawEmail || '').trim().toLowerCase();
}

export async function validateRealEmailAddress(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, 'Địa chỉ email không đúng định dạng (ví dụ: tenban@gmail.com).');
  }

  const domain = email.split('@')[1];
  if (!domain || BLOCKED_DISPOSABLE_DOMAINS.has(domain)) {
    throw new HttpError(
      400,
      'Hệ thống yêu cầu sử dụng Email thật, không chấp nhận email ảo hoặc dịch vụ email tạm thời.'
    );
  }

  // Check DNS MX records if not in KNOWN_VALID_DOMAINS
  if (!KNOWN_VALID_DOMAINS.has(domain)) {
    try {
      const mxRecords = await Promise.race([
        dns.resolveMx(domain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DNS_TIMEOUT')), 3500))
      ]);
      if (!Array.isArray(mxRecords) || mxRecords.length === 0) {
        throw new HttpError(
          400,
          `Tên miền "@${domain}" không có máy chủ nhận thư (MX record). Vui lòng nhập Email thật.`
        );
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') {
        throw new HttpError(
          400,
          `Tên miền email "@${domain}" không tồn tại. Vui lòng sử dụng Email thật (Gmail, Outlook, email công ty...).`
        );
      }
      // If DNS lookup timed out due to local network/firewall, allow valid syntax through
    }
  }

  return email;
}

export async function issueAndSendEmailOtp(rawEmail) {
  const email = await validateRealEmailAddress(rawEmail);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(email, {
    otp,
    expiresAt,
    verified: false,
    verifiedUntil: 0
  });

  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  let sentViaSmtp = false;
  let senderEmail = smtpUser || 'support@htparking.vn';

  if (smtpUser && smtpPass) {
    try {
      const nodemailerModule = await import('nodemailer');
      const nodemailer = nodemailerModule.default || nodemailerModule;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"HT Parking System" <${smtpUser}>`,
        to: email,
        subject: `[HT Parking] Mã xác thực OTP của bạn là ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
            <h2 style="color: #059669; margin-top: 0;">HT PARKING - Xác thực Email thật</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">
              Xin chào, cảm ơn bạn đã đăng ký sử dụng hệ thống bãi đỗ xe thông minh <b>HT Parking</b>.
              Vui lòng nhập mã OTP gồm 6 chữ số dưới đây để xác thực địa chỉ email của bạn:
            </p>
            <div style="background: #ecfdf5; border: 2px dashed #10b981; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #065f46;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 12px;">
              Mã xác thực này có hiệu lực trong vòng <b>10 phút</b>. Tuyệt đối không chia sẻ mã này cho người khác.
            </p>
          </div>
        `
      });
      sentViaSmtp = true;
      console.log(`[EMAIL-OTP-SMTP] Đã gửi email OTP [${otp}] từ ${smtpUser} tới ${email}`);
    } catch (smtpErr) {
      console.warn(`[EMAIL-OTP-SMTP-FALLBACK] Không thể gửi qua SMTP (${smtpErr.message}). Chuyển sang chế độ hiển thị trực tiếp.`);
    }
  } else {
    console.log(`[EMAIL-OTP-LOCAL] Mã OTP xác thực cho ${email} là: ${otp} (Cấu hình SMTP_USER & SMTP_PASS trong backend/.env để gửi qua Gmail thật)`);
  }

  return {
    email,
    sentViaSmtp,
    senderEmail,
    expiresInSeconds: 600,
    // Always provide devOtpPreview when SMTP isn't configured or fails so testing never blocks
    devOtpPreview: sentViaSmtp ? undefined : otp
  };
}

export function verifyEmailOtpCode(rawEmail, rawOtp) {
  const email = normalizeEmail(rawEmail);
  const submittedOtp = String(rawOtp || '').trim();

  if (!email || !submittedOtp) {
    throw new HttpError(400, 'Vui lòng nhập đầy đủ Email và mã OTP 6 chữ số.');
  }

  const record = otpStore.get(email);
  if (!record) {
    throw new HttpError(400, 'Chưa có mã OTP cho email này hoặc mã đã hết hạn. Vui lòng bấm "Gửi mã OTP".');
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    throw new HttpError(400, 'Mã OTP đã hết hạn (quá 10 phút). Vui lòng bấm gửi lại mã OTP mới.');
  }

  if (record.otp !== submittedOtp) {
    throw new HttpError(400, 'Mã OTP không chính xác. Vui lòng kiểm tra lại.');
  }

  record.verified = true;
  record.verifiedUntil = Date.now() + 30 * 60 * 1000; // Valid for 30 minutes to complete registration
  otpStore.set(email, record);

  return { verified: true, email };
}

export function isEmailOtpVerified(rawEmail, rawOtpOptional) {
  const email = normalizeEmail(rawEmail);
  const record = otpStore.get(email);
  if (!record) return false;
  if (record.verified && Date.now() <= record.verifiedUntil) {
    return true;
  }
  if (rawOtpOptional && String(rawOtpOptional).trim() === record.otp && Date.now() <= record.expiresAt) {
    record.verified = true;
    record.verifiedUntil = Date.now() + 30 * 60 * 1000;
    otpStore.set(email, record);
    return true;
  }
  return false;
}

export function consumeVerifiedEmail(rawEmail) {
  const email = normalizeEmail(rawEmail);
  otpStore.delete(email);
}

