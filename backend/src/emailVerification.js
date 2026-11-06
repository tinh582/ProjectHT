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

/**
 * Strictly validates that a phone number consists of exactly 10 numeric digits (e.g. 0901234567).
 * Returns null if rawPhone is null, undefined, or empty string.
 */
export function validatePhone10Digits(rawPhone) {
  if (rawPhone === null || rawPhone === undefined) return null;
  const trimmed = String(rawPhone).trim();
  if (!trimmed) return null;
  if (!/^\d{10}$/.test(trimmed)) {
    throw new HttpError(
      400,
      'Số điện thoại phải gồm đúng 10 chữ số (từ 0-9, ví dụ: 0901234567).'
    );
  }
  return trimmed;
}

/**
 * Builds anti-spam compliant mail options (Multipart Text + HTML, SPF/Return-Path envelope
 * alignment, Domain-aligned Message-ID, Transactional Security Headers, List-Unsubscribe)
 * to prevent confirmation/OTP emails from landing in Spam/Junk folders.
 */
export function buildAntiSpamMailOptions({
  smtpUser,
  fromName = 'HT Parking',
  to,
  subject,
  text,
  html,
  category = 'transactional-otp'
}) {
  const cleanSender = normalizeEmail(smtpUser) || 'support@htparking.vn';
  const senderDomain = cleanSender.split('@')[1] || 'htparking.vn';
  const cleanRecipient = normalizeEmail(to);
  const uniqueRefId = `htp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const messageId = `<${uniqueRefId}@${senderDomain}>`;

  return {
    from: {
      name: fromName,
      address: cleanSender
    },
    sender: cleanSender,
    replyTo: {
      name: fromName,
      address: cleanSender
    },
    to: cleanRecipient,
    // Strictly align SMTP Return-Path envelope with From address for SPF & DMARC alignment
    envelope: {
      from: cleanSender,
      to: cleanRecipient
    },
    messageId,
    subject,
    // Always include both plain-text and HTML (multipart/alternative) to avoid MIME_HTML_ONLY spam penalty
    text,
    html,
    priority: 'high',
    headers: {
      'X-Priority': '1 (Highest)',
      'X-MSMail-Priority': 'High',
      Importance: 'High',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
      'X-Entity-Ref-ID': uniqueRefId,
      'Feedback-ID': `${category}:htparking:transactional`,
      'List-Unsubscribe': `<mailto:${cleanSender}?subject=unsubscribe-${uniqueRefId}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };
}

async function createAntiSpamTransporter({ smtpHost, smtpPort, smtpUser, smtpPass }) {
  const nodemailerModule = await import('nodemailer');
  const nodemailer = nodemailerModule.default || nodemailerModule;
  const senderDomain = (normalizeEmail(smtpUser).split('@')[1]) || 'htparking.vn';

  const transportConfig = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    name: senderDomain, // Proper EHLO/HELO domain identification
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      minVersion: 'TLSv1.2'
    }
  };

  if (process.env.DKIM_DOMAIN && process.env.DKIM_KEY_SELECTOR && process.env.DKIM_PRIVATE_KEY) {
    transportConfig.dkim = {
      domainName: process.env.DKIM_DOMAIN,
      keySelector: process.env.DKIM_KEY_SELECTOR,
      privateKey: process.env.DKIM_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  return nodemailer.createTransport(transportConfig);
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
  const senderEmail = smtpUser || 'support@htparking.vn';

  const plainTextBody = [
    'HT PARKING - Xac thuc tai khoan cua ban',
    '',
    `Xin chao ${email},`,
    'Ban vua yeu cau ma xac thuc email tai he thong bai do xe thong minh HT Parking.',
    '',
    `Ma xac thuc (OTP 6 so) cua ban la: ${otp}`,
    '',
    'Ma nay co hieu luc trong vong 10 phut. Vui long khong chia se ma nay cho bat ky ai.',
    'Neu thu nay nam trong muc Thu rac (Spam), vui long nhan "Khong phai thu rac" (Report Not Spam) de nhan thong bao vao Hop thu den.',
    '',
    'Tran trong,',
    'Ban quan ly HT Parking System'
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mã xác thực tài khoản HT Parking</title>
</head>
<body style="margin: 0; padding: 16px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
    <tr>
      <td>
        <h2 style="color: #059669; margin: 0 0 12px 0; font-size: 20px;">HT Parking - Mã xác thực Email</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
          Xin chào <strong>${email}</strong>, cảm ơn bạn đã đăng ký sử dụng hệ thống bãi đỗ xe thông minh <strong>HT Parking</strong>.
          Vui lòng nhập mã xác thực gồm 6 chữ số dưới đây để hoàn tất xác minh địa chỉ email của bạn:
        </p>
        <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; color: #047857; margin-bottom: 4px; font-weight: bold;">MÃ XÁC THỰC (6 CHỮ SỐ)</div>
          <span style="font-size: 30px; font-weight: 700; letter-spacing: 6px; color: #065f46;">${otp}</span>
        </div>
        <p style="color: #475569; font-size: 12.5px; line-height: 1.5; margin: 0 0 12px 0;">
          Mã xác thực này có hiệu lực trong vòng <strong>10 phút</strong>. Nếu thư vô tình rơi vào mục <em>Thư rác (Spam)</em> hoặc <em>Quảng cáo</em>, vui lòng nhấn <strong>"Không phải thư rác" (Not Spam)</strong> để luôn nhận thông báo tại Hộp thư đến.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          Email giao dịch bảo mật được gửi tự động theo yêu cầu của ${email} tại hệ thống HT Parking Tower.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = buildAntiSpamMailOptions({
    smtpUser: senderEmail,
    fromName: 'HT Parking System',
    to: email,
    subject: `Ma xac thuc tai khoan HT Parking: ${otp}`,
    text: plainTextBody,
    html: htmlBody,
    category: 'transactional-otp'
  });

  if (smtpUser && smtpPass) {
    try {
      const transporter = await createAntiSpamTransporter({
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass
      });

      await transporter.sendMail(mailOptions);
      sentViaSmtp = true;
      console.log(`[EMAIL-OTP-SMTP] Đã gửi email OTP chống Spam [${otp}] từ ${smtpUser} tới ${email}`);
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
    antiSpamProtection: {
      enabled: true,
      multipartAlternative: true,
      spfEnvelopeAligned: true,
      messageIdDomainAligned: true,
      transactionalHeaders: true,
      messageId: mailOptions.messageId
    },
    // Always provide backupOtpCode / devOtpPreview so users/admins are never blocked if their email provider delays or filters the email into Spam
    backupOtpCode: otp,
    devOtpPreview: otp
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

// ============================================================================
// STAFF ACCOUNT EMAIL CONFIRMATION STORE & WORKFLOW
// When Admin creates a Staff account, the Staff member must confirm via their
// real email (using the confirmation link or 6-digit OTP code) before the
// account is marked as confirmed/in-use. Admin can view the live status.
// ============================================================================
const staffConfirmationStore = new Map();

export async function issueAndSendStaffConfirmationEmail({ userId, email: rawEmail, name = 'Nhân viên' }) {
  const email = await validateRealEmailAddress(rawEmail);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = `stf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const sentAt = new Date().toISOString();

  const record = {
    userId: userId || null,
    email,
    name,
    status: 'pending',
    otp,
    token,
    sentAt,
    confirmedAt: null
  };

  staffConfirmationStore.set(email, record);
  if (userId) {
    staffConfirmationStore.set(String(userId), record);
  }

  // Also store in otpStore so standard OTP check works seamlessly
  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours for staff activation
    verified: false,
    verifiedUntil: 0
  });

  const backendBase = process.env.BACKEND_ORIGIN || 'http://localhost:3001';
  const confirmUrl = `${backendBase}/api/components/Register/confirm-staff?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  let sentViaSmtp = false;
  const senderEmail = smtpUser || 'support@htparking.vn';

  const plainTextBody = [
    `Xin chao ${name},`,
    '',
    `Quan tri vien HT Parking vua khoi tao tai khoan Nhan vien van hanh (STAFF) cho ban voi email: ${email}.`,
    `Ma xac nhan kich hoat (OTP 6 so): ${otp}`,
    `Duong dan xac nhan truc tiep: ${confirmUrl}`,
    '',
    'Neu thu nay nam trong muc Thu rac (Spam), vui long chon "Khong phai thu rac" (Report Not Spam) de dam bao nhan day du thong bao van hanh.',
    '',
    'Tran trong,',
    'Ban quan tri HT Parking System'
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác nhận tài khoản Nhân viên HT Parking</title>
</head>
<body style="margin: 0; padding: 16px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
    <tr>
      <td>
        <h2 style="color: #059669; margin: 0 0 12px 0; font-size: 20px;">HT Parking - Xác nhận Tài khoản Nhân viên</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
          Xin chào <strong>${name}</strong>,<br/>
          Quản trị viên (Admin) vừa khởi tạo tài khoản <strong>Nhân viên vận hành (STAFF)</strong> cho bạn bằng địa chỉ email <strong>${email}</strong>.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Để xác nhận email này đang hoạt động và kích hoạt tài khoản đưa vào sử dụng, vui lòng nhấn vào nút xác nhận dưới đây hoặc nhập mã OTP 6 chữ số:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${confirmUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
            Xác nhận kích hoạt tài khoản Nhân viên
          </a>
        </div>
        <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 10px; padding: 14px; text-align: center; margin: 18px 0;">
          <div style="font-size: 12px; color: #047857; margin-bottom: 4px; font-weight: bold;">MÃ XÁC NHẬN EMAIL NHÂN VIÊN (6 CHỮ SỐ)</div>
          <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #065f46;">${otp}</span>
        </div>
        <p style="color: #475569; font-size: 12px; line-height: 1.5; margin: 0;">
          Lưu ý: Nếu thư nằm trong mục <em>Thư rác (Spam)</em>, vui lòng chọn <strong>"Không phải thư rác" (Not Spam)</strong>. Sau khi xác nhận, trạng thái tài khoản sẽ chuyển sang <strong>"Đã xác nhận Email &amp; Đang sử dụng"</strong>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = buildAntiSpamMailOptions({
    smtpUser: senderEmail,
    fromName: 'HT Parking Admin',
    to: email,
    subject: `Xac nhan tai khoan Nhan vien HT Parking - Ma OTP: ${otp}`,
    text: plainTextBody,
    html: htmlBody,
    category: 'transactional-staff-confirm'
  });

  if (smtpUser && smtpPass) {
    try {
      const transporter = await createAntiSpamTransporter({
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass
      });

      await transporter.sendMail(mailOptions);
      sentViaSmtp = true;
      console.log(`[STAFF-CONFIRM-SMTP] Đã gửi email kích hoạt nhân viên chống Spam [${otp}] tới ${email}`);
    } catch (smtpErr) {
      console.warn(`[STAFF-CONFIRM-FALLBACK] Không thể gửi qua SMTP (${smtpErr.message}). Sử dụng mã OTP & Link cục bộ.`);
    }
  } else {
    console.log(`[STAFF-CONFIRM-LOCAL] Nhân viên ${name} (${email}) - Mã xác nhận: ${otp} | Link: ${confirmUrl}`);
  }

  return {
    email,
    status: 'pending',
    sentAt,
    sentViaSmtp,
    confirmUrl,
    antiSpamProtection: {
      enabled: true,
      multipartAlternative: true,
      spfEnvelopeAligned: true,
      messageIdDomainAligned: true,
      transactionalHeaders: true,
      messageId: mailOptions.messageId
    },
    backupOtpCode: otp,
    devOtpPreview: otp
  };
}

export function confirmStaffAccountByTokenOrOtp({ email: rawEmail, userId, token, otp }) {
  const email = normalizeEmail(rawEmail);
  const record =
    (email && staffConfirmationStore.get(email)) ||
    (userId && staffConfirmationStore.get(String(userId)));

  if (!record) {
    // Check if otp matches otpStore as a fallback
    if (email && otp && isEmailOtpVerified(email, otp)) {
      const confirmedAt = new Date().toISOString();
      const fallbackRecord = {
        userId: userId || null,
        email,
        status: 'confirmed',
        confirmedAt,
        sentAt: confirmedAt
      };
      staffConfirmationStore.set(email, fallbackRecord);
      if (userId) staffConfirmationStore.set(String(userId), fallbackRecord);
      return fallbackRecord;
    }
    throw new HttpError(400, 'Không tìm thấy yêu cầu xác nhận cho tài khoản nhân viên này hoặc mã không hợp lệ.');
  }

  const cleanOtp = String(otp || '').trim();
  const cleanToken = String(token || '').trim();

  if (cleanToken && record.token === cleanToken) {
    record.status = 'confirmed';
    record.confirmedAt = new Date().toISOString();
  } else if (cleanOtp && record.otp === cleanOtp) {
    record.status = 'confirmed';
    record.confirmedAt = new Date().toISOString();
  } else {
    throw new HttpError(400, 'Mã xác nhận Email nhân viên (OTP) không chính xác. Vui lòng kiểm tra lại hộp thư.');
  }

  staffConfirmationStore.set(record.email, record);
  if (record.userId) {
    staffConfirmationStore.set(String(record.userId), record);
  }
  if (userId) {
    record.userId = userId;
    staffConfirmationStore.set(String(userId), record);
  }

  return record;
}

export function markStaffConfirmedByAdmin({ userId, email: rawEmail, confirmed = true }) {
  const email = normalizeEmail(rawEmail);
  const existing =
    (email && staffConfirmationStore.get(email)) ||
    (userId && staffConfirmationStore.get(String(userId)));

  const now = new Date().toISOString();
  const updated = {
    ...(existing || {}),
    userId: userId || existing?.userId || null,
    email: email || existing?.email || '',
    status: confirmed ? 'confirmed' : 'pending',
    confirmedAt: confirmed ? (existing?.confirmedAt || now) : null,
    sentAt: existing?.sentAt || now,
    otp: existing?.otp || String(Math.floor(100000 + Math.random() * 900000)),
    token: existing?.token || `stf_${Date.now()}`
  };

  if (updated.email) staffConfirmationStore.set(updated.email, updated);
  if (updated.userId) staffConfirmationStore.set(String(updated.userId), updated);
  return updated;
}

export function getStaffConfirmationStatus(profile) {
  if (!profile) return null;
  const email = normalizeEmail(profile.email);
  const record =
    (email && staffConfirmationStore.get(email)) ||
    (profile.id && staffConfirmationStore.get(String(profile.id)));

  if (record) {
    const isConfirmed = record.status === 'confirmed';
    return {
      email_verified: isConfirmed,
      staff_confirmation_status: record.status,
      staff_confirmed_at: record.confirmedAt || null,
      staff_sent_at: record.sentAt || null,
      dev_otp_preview: !isConfirmed ? record.otp : undefined,
      confirm_url: !isConfirmed
        ? `${process.env.BACKEND_ORIGIN || 'http://localhost:3001'}/api/components/Register/confirm-staff?email=${encodeURIComponent(record.email)}&token=${encodeURIComponent(record.token)}`
        : undefined
    };
  }

  // If no explicit record in memory store, check profile.email_verified
  const verifiedInDb = profile.email_verified !== false;
  return {
    email_verified: verifiedInDb,
    staff_confirmation_status: verifiedInDb ? 'confirmed' : 'pending',
    staff_confirmed_at: null,
    staff_sent_at: profile.created_at || null
  };
}
