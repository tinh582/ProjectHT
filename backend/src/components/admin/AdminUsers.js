import express from 'express';
import { HttpError, pageRange, requireId, requireText } from '../../http.js';
import { purgeSensitiveUserData } from '../../privacyEngine.js';
import { userDocumentsStore } from '../../supportStore.js';
import {
  validateRealEmailAddress,
  issueAndSendStaffConfirmationEmail,
  confirmStaffAccountByTokenOrOtp,
  markStaffConfirmedByAdmin,
  getStaffConfirmationStatus
} from '../../emailVerification.js';

const router = express.Router();

// 1. READ ALL ACCOUNTS (Paginated + Staff Email Confirmation Status)
router.get('/', async (req, res) => {
  const { page, pageSize, from, to } = pageRange(req.query);
  let data = null;
  let count = null;
  try {
    const resDb = await req.db.from('profiles')
      .select('id, name, email, role, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to);
    data = resDb.data;
    count = resDb.count;
    if (resDb.error) throw resDb.error;
  } catch {
    try {
      const resFallback = await req.db.from('profiles')
        .select('id, name, email, role, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to);
      data = resFallback.data;
      count = resFallback.count;
    } catch {
      const fallback = await req.db.from('profiles')
        .select('id, name, email, role, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to);
      data = fallback.data;
      count = fallback.count;
    }
  }

  const enrichedItems = (data || []).map((u) => {
    const staffConf = getStaffConfirmationStatus(u);
    const extraDocs = userDocumentsStore.get(u.id) || {};
    return {
      ...u,
      driver_license_front: u.driver_license_front || extraDocs.driver_license_front || null,
      driver_license_back: u.driver_license_back || extraDocs.driver_license_back || null,
      ...staffConf
    };
  });

  res.json({ items: enrichedItems, total: count || 0, page, pageSize });
});

// 2. READ SINGLE ACCOUNT 360° DETAILS (Profile + Vehicles + Fixed Slots + Transactions)
router.get('/:id/details', async (req, res) => {
  const id = requireId(req.params.id);

  let profile = null;
  try {
    const { data, error } = await req.db
      .from('profiles')
      .select('id, name, email, role, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    profile = data;
  } catch {
    try {
      const { data } = await req.db
        .from('profiles')
        .select('id, name, email, role, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at')
        .eq('id', id)
        .maybeSingle();
      profile = data;
    } catch {
      const { data } = await req.db
        .from('profiles')
        .select('id, name, email, role, created_at')
        .eq('id', id)
        .maybeSingle();
      profile = data;
    }
  }

  if (!profile) throw new HttpError(404, 'Không tìm thấy tài khoản.');

  const extraDocs = userDocumentsStore.get(id) || {};
  profile = {
    ...profile,
    driver_license_front: profile.driver_license_front || extraDocs.driver_license_front || null,
    driver_license_back: profile.driver_license_back || extraDocs.driver_license_back || null,
    ...getStaffConfirmationStatus(profile)
  };

  let vehicles = [];
  try {
    const { data } = await req.db
      .from('vehicles')
      .select('id, license_plate, type, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    vehicles = data || [];
  } catch {
    vehicles = [];
  }

  let slots = [];
  try {
    const { data } = await req.db
      .from('parking_slots')
      .select('id, status, vehicle_type, vehicle_id, assigned_user_id, reserved_until');
    const vehicleIds = new Set(vehicles.map((v) => v.id));
    slots = (data || []).filter(
      (s) => s.assigned_user_id === id || (s.vehicle_id && vehicleIds.has(s.vehicle_id))
    );
  } catch {
    slots = [];
  }

  let transactions = [];
  try {
    const { data } = await req.db
      .from('transactions')
      .select('id, amount, status, created_at, confirmed_at, cycle_start, cycle_end, verified_by, proof_image, pricing_id')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    transactions = data || [];
  } catch {
    try {
      const { data } = await req.db
        .from('transactions')
        .select('id, amount, status, created_at, confirmed_at, pricing_id')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      transactions = data || [];
    } catch {
      transactions = [];
    }
  }

  res.json({
    profile,
    vehicles,
    slots,
    transactions
  });
});

// 3. CREATE NEW ACCOUNT (Full fields + Staff Real Email Confirmation Workflow)
router.post('/', async (req, res) => {
  const name = requireText(req.body.name, 'Full name');
  const rawEmail = requireText(req.body.email, 'Email');
  const email = await validateRealEmailAddress(rawEmail);
  const password = requireText(req.body.password, 'Password', 1024);
  const role = req.body.role || 'user';
  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  const address = req.body.address ? String(req.body.address).trim() : null;
  const kyc_status = req.body.kyc_status || 'verified';
  const id_card_front = req.body.id_card_front || null;
  const id_card_back = req.body.id_card_back || null;
  const driver_license_front = req.body.driver_license_front || null;
  const driver_license_back = req.body.driver_license_back || null;

  // When Admin creates a Staff account, the Staff member must confirm in their real email
  // before the account is marked as confirmed/in-use.
  const isStaff = role === 'staff';
  const email_verified = isStaff
    ? false
    : req.body.email_verified !== undefined
    ? Boolean(req.body.email_verified)
    : true;

  if (password.length < 8) throw new HttpError(400, 'Mật khẩu phải có ít nhất 8 ký tự.');
  if (!['user', 'staff', 'admin'].includes(role)) throw new HttpError(400, 'Quyền (Role) không hợp lệ.');
  if (!['unverified', 'pending', 'verified', 'rejected'].includes(kyc_status)) {
    throw new HttpError(400, 'Trạng thái KYC không hợp lệ.');
  }

  const { data: authData, error: authError } = await req.db.auth.admin.createUser({
    email,
    password,
    // Keep Supabase Auth login enabled so Staff can sign in and enter their email OTP / click email link
    email_confirm: true,
    user_metadata: { full_name: name, phone, address, staff_confirmed: !isStaff }
  });
  if (authError) throw new HttpError(400, authError.message);

  const userId = authData.user.id;
  userDocumentsStore.set(userId, {
    id_card_front,
    id_card_back,
    driver_license_front,
    driver_license_back
  });

  const fullProfilePayload = {
    id: userId,
    name,
    email,
    role,
    phone,
    address,
    email_verified,
    kyc_status,
    id_card_front,
    id_card_back,
    driver_license_front,
    driver_license_back
  };

  const { error: profileError } = await req.db
    .from('profiles')
    .upsert(fullProfilePayload, { onConflict: 'id', ignoreDuplicates: false });

  if (profileError) {
    // Fallback if optional KYC columns do not exist in DB yet
    const { error: fallbackError } = await req.db
      .from('profiles')
      .upsert({ id: userId, name, email, role }, { onConflict: 'id', ignoreDuplicates: false });
    if (fallbackError) throw fallbackError;
  }

  let staffConfirmation = null;
  if (isStaff) {
    staffConfirmation = await issueAndSendStaffConfirmationEmail({
      userId,
      email,
      name
    });
  }

  res.status(201).json({
    success: true,
    id: userId,
    staffConfirmationRequired: isStaff,
    ...(staffConfirmation || {})
  });
});

// 3b. RESEND STAFF EMAIL CONFIRMATION (Admin action)
router.post('/:id/resend-staff-confirm', async (req, res) => {
  const id = requireId(req.params.id);
  const { data: profile } = await req.db
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', id)
    .maybeSingle();

  const email = req.body.email || profile?.email;
  const name = req.body.name || profile?.name || 'Nhân viên';
  if (!email) throw new HttpError(400, 'Không tìm thấy địa chỉ email của tài khoản.');

  try {
    await req.db.from('profiles').update({ email_verified: false }).eq('id', id);
  } catch {
    // Ignore if optional column missing
  }

  const result = await issueAndSendStaffConfirmationEmail({ userId: id, email, name });
  res.json({
    success: true,
    ...result,
    message: result.sentViaSmtp
      ? `Đã gửi thư xác nhận kích hoạt tới hộp thư ${result.email} của nhân viên ${name}!`
      : `Đã tạo và gửi mã xác nhận kích hoạt cho nhân viên ${name} (${result.email})!`
  });
});

// 3c. CONFIRM STAFF ACCOUNT BY OTP (Admin or Staff enters 6-digit OTP from staff's email)
router.post('/:id/confirm-staff-otp', async (req, res) => {
  const id = requireId(req.params.id);
  const otp = requireText(req.body.otp, 'Mã OTP xác nhận', 16);
  const email = req.body.email || '';

  const record = confirmStaffAccountByTokenOrOtp({ email, userId: id, otp });

  try {
    await req.db.from('profiles').update({ email_verified: true }).eq('id', id);
  } catch {
    // Ignore if optional column missing
  }

  res.json({
    success: true,
    confirmed: true,
    confirmedAt: record.confirmedAt,
    message: `✓ Nhân viên (${record.email}) đã xác nhận Email thành công và kích hoạt tài khoản sử dụng!`
  });
});

// 4. UPDATE ROLE QUICK ACTION
router.put('/:id/role', async (req, res) => {
  const id = requireId(req.params.id);
  const role = req.body.role;
  if (!['user', 'staff', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role.');
  if (id === req.user.id) throw new HttpError(409, 'You cannot change your own role.');
  const { data, error } = await req.db.from('profiles').update({ role }).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

// 5. UPDATE KYC STATUS QUICK ACTION
router.put('/:id/kyc', async (req, res) => {
  const id = requireId(req.params.id);
  const kyc_status = req.body.kyc_status || req.body.status;
  if (!['unverified', 'pending', 'verified', 'rejected'].includes(kyc_status)) {
    throw new HttpError(400, 'Trạng thái KYC không hợp lệ.');
  }
  const { data, error } = await req.db.from('profiles').update({ kyc_status }).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

// 6. UPDATE FULL ACCOUNT DETAILS (Name, Email, Phone, Address, Role, KYC, Email Verified, CCCD, Optional Password)
router.put('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const name = requireText(req.body.name, 'Name');
  const email = requireText(req.body.email, 'Email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Địa chỉ email không hợp lệ.');

  const updatePayload = { name, email };

  if (req.body.phone !== undefined) {
    updatePayload.phone = req.body.phone ? String(req.body.phone).trim() : null;
  }
  if (req.body.address !== undefined) {
    updatePayload.address = req.body.address ? String(req.body.address).trim() : null;
  }
  if (req.body.role !== undefined) {
    if (!['user', 'staff', 'admin'].includes(req.body.role)) {
      throw new HttpError(400, 'Quyền (Role) không hợp lệ.');
    }
    if (id === req.user.id && req.body.role !== 'admin') {
      throw new HttpError(409, 'Bạn không thể tự hạ quyền Quản trị viên của chính mình.');
    }
    updatePayload.role = req.body.role;
  }
  if (req.body.kyc_status !== undefined) {
    if (!['unverified', 'pending', 'verified', 'rejected'].includes(req.body.kyc_status)) {
      throw new HttpError(400, 'Trạng thái KYC không hợp lệ.');
    }
    updatePayload.kyc_status = req.body.kyc_status;
  }
  if (req.body.email_verified !== undefined) {
    updatePayload.email_verified = Boolean(req.body.email_verified);
    markStaffConfirmedByAdmin({
      userId: id,
      email,
      confirmed: Boolean(req.body.email_verified)
    });
  }
  if (req.body.id_card_front !== undefined) {
    updatePayload.id_card_front = req.body.id_card_front || null;
  }
  if (req.body.id_card_back !== undefined) {
    updatePayload.id_card_back = req.body.id_card_back || null;
  }
  if (req.body.driver_license_front !== undefined) {
    updatePayload.driver_license_front = req.body.driver_license_front || null;
  }
  if (req.body.driver_license_back !== undefined) {
    updatePayload.driver_license_back = req.body.driver_license_back || null;
  }

  if (
    req.body.driver_license_front !== undefined ||
    req.body.driver_license_back !== undefined ||
    req.body.id_card_front !== undefined ||
    req.body.id_card_back !== undefined
  ) {
    const prev = userDocumentsStore.get(id) || {};
    userDocumentsStore.set(id, {
      ...prev,
      id_card_front: req.body.id_card_front !== undefined ? (req.body.id_card_front || null) : prev.id_card_front,
      id_card_back: req.body.id_card_back !== undefined ? (req.body.id_card_back || null) : prev.id_card_back,
      driver_license_front: req.body.driver_license_front !== undefined ? (req.body.driver_license_front || null) : prev.driver_license_front,
      driver_license_back: req.body.driver_license_back !== undefined ? (req.body.driver_license_back || null) : prev.driver_license_back,
    });
  }

  // Optional password reset / auth email sync via Supabase Auth Admin API
  if (req.body.password && String(req.body.password).trim().length > 0) {
    const newPassword = String(req.body.password);
    if (newPassword.length < 8) {
      throw new HttpError(400, 'Mật khẩu mới phải có ít nhất 8 ký tự.');
    }
    try {
      if (req.db.auth?.admin?.updateUserById) {
        const { error: pwErr } = await req.db.auth.admin.updateUserById(id, {
          email,
          password: newPassword,
          user_metadata: { full_name: name, phone: updatePayload.phone, address: updatePayload.address }
        });
        if (pwErr) throw new HttpError(400, pwErr.message);
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.warn('Could not update auth.users password:', err?.message);
    }
  }

  let data = null;
  let error = null;
  const resUpdate = await req.db.from('profiles').update(updatePayload).eq('id', id).select('id').maybeSingle();
  data = resUpdate.data;
  error = resUpdate.error;

  if (error) {
    // Fallback to core columns if extended columns are not in DB schema
    const corePayload = { name, email };
    if (updatePayload.role) corePayload.role = updatePayload.role;
    const fallbackUpdate = await req.db.from('profiles').update(corePayload).eq('id', id).select('id').maybeSingle();
    if (fallbackUpdate.error) throw fallbackUpdate.error;
    data = fallbackUpdate.data;
  }

  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

// 7. ZERO-DATA RETENTION PURGE (Reset sensitive PII & KYC to Zero without deleting account row)
router.post('/:id/purge-zero', async (req, res) => {
  const id = requireId(req.params.id);
  if (id === req.user.id) throw new HttpError(409, 'Không thể xóa trắng dữ liệu tài khoản đang đăng nhập.');

  const result = await purgeSensitiveUserData(req.db, id, 'ADMIN_ZERO_DATA_PURGE');
  res.json({
    success: true,
    result,
    message: 'Đã xóa sạch dữ liệu nhạy cảm (SĐT, Địa chỉ, CCCD 2 mặt, giải phóng ô đỗ) về trạng thái Zero.'
  });
});

// 8. HARD DELETE ACCOUNT + ZERO-DATA PURGE
router.delete('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  if (id === req.user.id) throw new HttpError(409, 'You cannot delete your own account.');

  await purgeSensitiveUserData(req.db, id, 'ADMIN_DELETE');
  await req.db.from('profiles').delete().eq('id', id);

  try {
    if (req.db.auth?.admin?.deleteUser) {
      await req.db.auth.admin.deleteUser(id);
    }
  } catch (authErr) {
    console.warn('Could not delete auth.users row:', authErr?.message);
  }

  res.json({ success: true, message: 'Tài khoản đã được xóa sạch hoàn toàn theo chính sách Zero-Data Retention.' });
});

export default router;
