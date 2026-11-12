import express from 'express';
import { HttpError, pageRange, requireId, requireText, withSupabaseRetry } from '../../http.js';
import { purgeSensitiveUserData } from '../../privacyEngine.js';
import { userDocumentsStore, packKycColumnsForDb, unpackKycProfile } from '../../supportStore.js';
import { runSql, sqlVal, sqlSet, sqlValues } from '../../nativeSql.js';
import {
  validateRealEmailAddress,
  validatePhone10Digits,
  issueAndSendStaffConfirmationEmail,
  confirmStaffAccountByTokenOrOtp,
  markStaffConfirmedByAdmin,
  getStaffConfirmationStatus
} from '../../emailVerification.js';

const router = express.Router();

// 1. READ ALL ACCOUNTS (Paginated + Staff Email Confirmation Status)
// Copy-pasteable Supabase SQL Editor query:
// SELECT id, name, email, role, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at FROM public.profiles ORDER BY created_at DESC, id ASC LIMIT 25 OFFSET 0;
router.get('/', async (req, res) => {
  const { page, pageSize, from } = pageRange(req.query);
  let data = null;
  let count = null;

  try {
    const resDb = await runSql(
      req.db,
      `SELECT id, name, email, role, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at
       FROM public.profiles
       ORDER BY created_at DESC, id
       LIMIT ${pageSize} OFFSET ${from};`,
      { countExact: true }
    );
    if (resDb.error) throw resDb.error;
    data = resDb.data;
    count = resDb.count;
  } catch {
    try {
      const resFallback = await runSql(
        req.db,
        `SELECT id, name, email, role, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at
         FROM public.profiles
         ORDER BY created_at DESC, id
         LIMIT ${pageSize} OFFSET ${from};`,
        { countExact: true }
      );
      data = resFallback.data;
      count = resFallback.count;
    } catch {
      const fallback = await runSql(
        req.db,
        `SELECT id, name, email, role, created_at
         FROM public.profiles
         ORDER BY created_at DESC, id
         LIMIT ${pageSize} OFFSET ${from};`,
        { countExact: true }
      );
      data = fallback.data;
      count = fallback.count;
    }
  }

  const enrichedItems = (data || []).map((u) => {
    const staffConf = getStaffConfirmationStatus(u);
    const unpacked = unpackKycProfile(u, u.id);
    return {
      ...unpacked,
      ...staffConf
    };
  });

  res.json({ items: enrichedItems, total: count || 0, page, pageSize });
});

// 2. READ SINGLE ACCOUNT 360° DETAILS (Profile + Vehicles + Fixed Slots + Transactions)
// Copy-pasteable Supabase SQL Editor query:
// SELECT id, name, email, role, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at FROM public.profiles WHERE id = '<USER_UUID>' LIMIT 1;
router.get('/:id/details', async (req, res) => {
  const id = requireId(req.params.id);

  let profile = null;
  try {
    const { data, error } = await runSql(
      req.db,
      `SELECT id, name, email, role, phone, address, id_card_front, id_card_back, driver_license_front, driver_license_back, kyc_status, email_verified, created_at
       FROM public.profiles
       WHERE id = ${sqlVal(id)}
       LIMIT 1;`,
      { maybeSingle: true }
    );
    if (error) throw error;
    profile = data;
  } catch {
    try {
      const { data } = await runSql(
        req.db,
        `SELECT id, name, email, role, phone, address, id_card_front, id_card_back, kyc_status, email_verified, created_at
         FROM public.profiles
         WHERE id = ${sqlVal(id)}
         LIMIT 1;`,
        { maybeSingle: true }
      );
      profile = data;
    } catch {
      const { data } = await runSql(
        req.db,
        `SELECT id, name, email, role, created_at
         FROM public.profiles
         WHERE id = ${sqlVal(id)}
         LIMIT 1;`,
        { maybeSingle: true }
      );
      profile = data;
    }
  }

  if (!profile) throw new HttpError(404, 'Không tìm thấy tài khoản.');

  const unpackedProfile = unpackKycProfile(profile, id);
  profile = {
    ...unpackedProfile,
    ...getStaffConfirmationStatus(unpackedProfile)
  };

  let vehicles = [];
  try {
    const { data } = await runSql(
      req.db,
      `SELECT id, license_plate, type, created_at
       FROM public.vehicles
       WHERE user_id = ${sqlVal(id)}
       ORDER BY created_at DESC;`
    );
    vehicles = data || [];
  } catch {
    vehicles = [];
  }

  let slots = [];
  try {
    const { data } = await runSql(
      req.db,
      `SELECT id, status, vehicle_type, vehicle_id, assigned_user_id, reserved_until
       FROM public.parking_slots;`
    );
    const vehicleIds = new Set(vehicles.map((v) => v.id));
    slots = (data || []).filter(
      (s) => s.assigned_user_id === id || (s.vehicle_id && vehicleIds.has(s.vehicle_id))
    );
  } catch {
    slots = [];
  }

  let transactions = [];
  try {
    const { data } = await runSql(
      req.db,
      `SELECT id, amount, status, created_at, confirmed_at, cycle_start, cycle_end, verified_by, proof_image, pricing_id
       FROM public.transactions
       WHERE user_id = ${sqlVal(id)}
       ORDER BY created_at DESC
       LIMIT 10;`
    );
    transactions = data || [];
  } catch {
    try {
      const { data } = await runSql(
        req.db,
        `SELECT id, amount, status, created_at, confirmed_at, pricing_id
         FROM public.transactions
         WHERE user_id = ${sqlVal(id)}
         ORDER BY created_at DESC
         LIMIT 10;`
      );
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
  const phone = validatePhone10Digits(req.body.phone);
  const address = req.body.address ? String(req.body.address).trim() : null;
  const kyc_status = req.body.kyc_status || 'verified';
  const id_card_front = req.body.id_card_front || null;
  const id_card_back = req.body.id_card_back || null;
  const driver_license_front = req.body.driver_license_front || null;
  const driver_license_back = req.body.driver_license_back || null;

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

  const { data: authData, error: authError } = await withSupabaseRetry(() =>
    req.db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone, address, staff_confirmed: !isStaff }
    })
  );
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

  const { error: profileError } = await runSql(
    req.db,
    `INSERT INTO public.profiles ${sqlValues(fullProfilePayload)}
     ON CONFLICT (id) DO UPDATE SET ${sqlSet(fullProfilePayload)};`
  );

  if (profileError) {
    const packed = packKycColumnsForDb({
      id_card_front,
      id_card_back,
      driver_license_front,
      driver_license_back
    });
    const fallbackWithDocs = {
      id: userId,
      name,
      email,
      role,
      phone,
      address,
      email_verified,
      kyc_status,
      id_card_front: packed.id_card_front,
      id_card_back: packed.id_card_back
    };
    const { error: fallbackDocsErr } = await runSql(
      req.db,
      `INSERT INTO public.profiles ${sqlValues(fallbackWithDocs)}
       ON CONFLICT (id) DO UPDATE SET ${sqlSet(fallbackWithDocs)};`
    );
    if (fallbackDocsErr) {
      const fallbackCore = { id: userId, name, email, role };
      const { error: fallbackError } = await runSql(
        req.db,
        `INSERT INTO public.profiles ${sqlValues(fallbackCore)}
         ON CONFLICT (id) DO UPDATE SET ${sqlSet(fallbackCore)};`
      );
      if (fallbackError) throw fallbackError;
    }
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
  const { data: profile } = await runSql(
    req.db,
    `SELECT id, name, email, role
     FROM public.profiles
     WHERE id = ${sqlVal(id)}
     LIMIT 1;`,
    { maybeSingle: true }
  );

  const email = req.body.email || profile?.email;
  const name = req.body.name || profile?.name || 'Nhân viên';
  if (!email) throw new HttpError(400, 'Không tìm thấy địa chỉ email của tài khoản.');

  try {
    await runSql(
      req.db,
      `UPDATE public.profiles
       SET email_verified = FALSE
       WHERE id = ${sqlVal(id)};`
    );
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
    await runSql(
      req.db,
      `UPDATE public.profiles
       SET email_verified = TRUE
       WHERE id = ${sqlVal(id)};`
    );
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
// Copy-pasteable Supabase SQL Editor query:
// UPDATE public.profiles SET role = 'staff' WHERE id = '<USER_UUID>' RETURNING id;
router.put('/:id/role', async (req, res) => {
  const id = requireId(req.params.id);
  const role = req.body.role;
  if (!['user', 'staff', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role.');
  if (id === req.user.id) throw new HttpError(409, 'You cannot change your own role.');
  const { data, error } = await runSql(
    req.db,
    `UPDATE public.profiles
     SET role = ${sqlVal(role)}
     WHERE id = ${sqlVal(id)}
     RETURNING id;`,
    { maybeSingle: true }
  );
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

// 5. UPDATE KYC STATUS QUICK ACTION
// Copy-pasteable Supabase SQL Editor query:
// UPDATE public.profiles SET kyc_status = 'verified' WHERE id = '<USER_UUID>' RETURNING id;
router.put('/:id/kyc', async (req, res) => {
  const id = requireId(req.params.id);
  const kyc_status = req.body.kyc_status || req.body.status;
  if (!['unverified', 'pending', 'verified', 'rejected'].includes(kyc_status)) {
    throw new HttpError(400, 'Trạng thái KYC không hợp lệ.');
  }
  const { data, error } = await runSql(
    req.db,
    `UPDATE public.profiles
     SET kyc_status = ${sqlVal(kyc_status)}
     WHERE id = ${sqlVal(id)}
     RETURNING id;`,
    { maybeSingle: true }
  );
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

// 6. UPDATE FULL ACCOUNT DETAILS
router.put('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const name = requireText(req.body.name, 'Name');
  const email = requireText(req.body.email, 'Email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Địa chỉ email không hợp lệ.');

  const updatePayload = { name, email };

  if (req.body.phone !== undefined) {
    updatePayload.phone = validatePhone10Digits(req.body.phone);
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
  const resUpdate = await runSql(
    req.db,
    `UPDATE public.profiles
     SET ${sqlSet(updatePayload)}
     WHERE id = ${sqlVal(id)}
     RETURNING id;`,
    { maybeSingle: true }
  );
  data = resUpdate.data;

  if (resUpdate.error) {
    const storedDocs = userDocumentsStore.get(id) || {};
    const packed = packKycColumnsForDb(storedDocs);
    const safePayload = { ...updatePayload };
    delete safePayload.driver_license_front;
    delete safePayload.driver_license_back;
    if (
      req.body.id_card_front !== undefined ||
      req.body.id_card_back !== undefined ||
      req.body.driver_license_front !== undefined ||
      req.body.driver_license_back !== undefined
    ) {
      safePayload.id_card_front = packed.id_card_front;
      safePayload.id_card_back = packed.id_card_back;
    }

    const resSafe = await runSql(
      req.db,
      `UPDATE public.profiles
       SET ${sqlSet(safePayload)}
       WHERE id = ${sqlVal(id)}
       RETURNING id;`,
      { maybeSingle: true }
    );
    if (!resSafe.error && resSafe.data) {
      data = resSafe.data;
    } else {
      const corePayload = { name, email };
      if (updatePayload.role) corePayload.role = updatePayload.role;
      const fallbackUpdate = await runSql(
        req.db,
        `UPDATE public.profiles
         SET ${sqlSet(corePayload)}
         WHERE id = ${sqlVal(id)}
         RETURNING id;`,
        { maybeSingle: true }
      );
      if (fallbackUpdate.error) throw fallbackUpdate.error;
      data = fallbackUpdate.data;
    }
  }

  if (!data) throw new HttpError(404, 'Account not found.');
  res.json({ success: true });
});

// 7. ZERO-DATA RETENTION PURGE
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
// Copy-pasteable Supabase SQL Editor query:
// DELETE FROM public.profiles WHERE id = '<USER_UUID>';
router.delete('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  if (id === req.user.id) throw new HttpError(409, 'You cannot delete your own account.');

  await purgeSensitiveUserData(req.db, id, 'ADMIN_DELETE');
  await runSql(
    req.db,
    `DELETE FROM public.profiles
     WHERE id = ${sqlVal(id)};`
  );

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
