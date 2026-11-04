import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '../shared/Pagination';
import { readPage } from '../../lib/pagination';
import {
  SAMPLE_KYC_PROFILES,
  buildSampleCccdFront,
  buildSampleCccdBack,
  buildSampleGplxFront,
  buildSampleGplxBack
} from '../../lib/sampleKyc';

const EMPTY_ADD_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  role: 'user',
  kyc_status: 'verified',
  email_verified: true,
  id_card_front: '',
  id_card_back: '',
  driver_license_front: '',
  driver_license_back: ''
};

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const pageSize = 25;

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');

  // 1. CREATE: Add new user state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2. READ 360°: View full user details modal (Profile + Vehicles + Slots + Transactions)
  const [detailUser, setDetailUser] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 3. UPDATE: Full Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'user',
    kyc_status: 'unverified',
    email_verified: true,
    id_card_front: '',
    id_card_back: '',
    driver_license_front: '',
    driver_license_back: '',
    password: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // 4. KYC Quick Inspection Modal
  const [viewKycUser, setViewKycUser] = useState(null);

  // 5. DELETE / ZERO-DATA PURGE Modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteMode, setDeleteMode] = useState('hard'); // 'hard' | 'zero'
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 6. STAFF EMAIL CONFIRMATION Modal
  const [staffConfirmModalUser, setStaffConfirmModalUser] = useState(null);
  const [staffOtpInput, setStaffOtpInput] = useState('');
  const [staffConfirmLoading, setStaffConfirmLoading] = useState(false);
  const [staffConfirmError, setStaffConfirmError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const fetchUsers = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await apiFetch(`/api/components/admin/AdminUsers?page=${page}&pageSize=${pageSize}`);
      if (!response.ok) return;
      const data = readPage(await response.json(), page, pageSize);
      setUsers(data.items);
      setTotal(data.total);
      if (page > 1 && data.items.length === 0) setPage(page - 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered users list for instant client-side search & filtering
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const normalizedRole = u.role === 'customer' ? 'user' : (u.role || 'user');
      if (roleFilter !== 'all' && normalizedRole !== roleFilter) return false;
      const normalizedKyc = u.kyc_status || 'unverified';
      if (kycFilter !== 'all' && normalizedKyc !== kycFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (u.name || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchPhone = (u.phone || '').toLowerCase().includes(q);
        const matchAddress = (u.address || '').toLowerCase().includes(q);
        const matchId = String(u.id || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchAddress || matchId;
      }
      return true;
    });
  }, [users, searchQuery, roleFilter, kycFilter]);

  // Summary metrics
  const stats = useMemo(() => {
    const totalLoaded = users.length;
    const verifiedKyc = users.filter((u) => u.kyc_status === 'verified').length;
    const pendingKyc = users.filter((u) => u.kyc_status === 'pending').length;
    const staffAndAdmin = users.filter((u) => u.role === 'admin' || u.role === 'staff').length;
    const pendingStaffConfirm = users.filter(
      (u) => u.role === 'staff' && (u.staff_confirmation_status === 'pending' || u.email_verified === false)
    ).length;
    return { totalLoaded, verifiedKyc, pendingKyc, staffAndAdmin, pendingStaffConfirm };
  }, [users]);

  // Helper to read uploaded CCCD image as base64 data URL
  const handleImageFile = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // ------------------------------------------------------------
  // CREATE ACCOUNT
  // ------------------------------------------------------------
  const openAddDialog = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddError('');
    setShowPassword(false);
    setShowAddDialog(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      const response = await apiFetch('/api/components/admin/AdminUsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await response.json();
      if (!response.ok) {
        setAddError(data.error || 'Lỗi khi tạo tài khoản.');
        return;
      }
      setShowAddDialog(false);
      const createdEmail = addForm.email;
      const createdRole = addForm.role;
      const createdName = addForm.name;
      setAddForm(EMPTY_ADD_FORM);
      await fetchUsers();
      if (createdRole === 'staff') {
        showToast(
          `📩 Đã tạo tài khoản Nhân viên ${createdEmail} và gửi thư xác nhận tới Email thật! Trạng thái: Chờ nhân viên xác nhận Email.${
            data.devOtpPreview ? ` (Mã OTP trong thư: ${data.devOtpPreview})` : ''
          }`
        );
        setStaffConfirmModalUser({
          id: data.id,
          name: createdName,
          email: createdEmail,
          role: 'staff',
          staff_confirmation_status: 'pending',
          dev_otp_preview: data.devOtpPreview,
          confirm_url: data.confirmUrl
        });
        setStaffOtpInput(data.devOtpPreview || '');
        setStaffConfirmError('');
      } else {
        showToast(`Đã tạo tài khoản ${createdEmail} thành công!`);
      }
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ------------------------------------------------------------
  // STAFF EMAIL CONFIRMATION HANDLERS
  // ------------------------------------------------------------
  const handleResendStaffConfirm = async (u) => {
    try {
      const res = await apiFetch(`/api/components/admin/AdminUsers/${u.id}/resend-staff-confirm`, {
        method: 'POST',
        body: JSON.stringify({ email: u.email, name: u.name })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `${data.message || 'Đã gửi lại mail xác nhận!'}${
            data.devOtpPreview ? ` (Mã OTP mới: ${data.devOtpPreview})` : ''
          }`
        );
        fetchUsers();
      } else {
        alert(data.error || 'Không thể gửi lại mail xác nhận.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const openStaffConfirmModal = (u) => {
    setStaffConfirmModalUser(u);
    setStaffOtpInput(u.dev_otp_preview || '');
    setStaffConfirmError('');
  };

  const handleConfirmStaffOtpSubmit = async (e) => {
    e.preventDefault();
    if (!staffConfirmModalUser) return;
    setStaffConfirmLoading(true);
    setStaffConfirmError('');
    try {
      const res = await apiFetch(`/api/components/admin/AdminUsers/${staffConfirmModalUser.id}/confirm-staff-otp`, {
        method: 'POST',
        body: JSON.stringify({
          email: staffConfirmModalUser.email,
          otp: staffOtpInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffConfirmError(data.error || 'Mã xác nhận không hợp lệ.');
        return;
      }
      setStaffConfirmModalUser(null);
      showToast(data.message || `✓ Nhân viên ${staffConfirmModalUser.email} đã xác nhận Email kích hoạt sử dụng!`);
      fetchUsers();
    } catch (err) {
      setStaffConfirmError(err.message);
    } finally {
      setStaffConfirmLoading(false);
    }
  };

  // ------------------------------------------------------------
  // READ 360° ACCOUNT DETAILS
  // ------------------------------------------------------------
  const openDetailModal = async (u) => {
    setDetailUser(u);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/components/admin/AdminUsers/${u.id}/details`);
      if (res.ok) {
        setDetailData(await res.json());
      }
    } catch {
      // Fallback to row data
    } finally {
      setDetailLoading(false);
    }
  };

  // ------------------------------------------------------------
  // UPDATE ACCOUNT (FULL FIELDS + OPTIONAL PASSWORD RESET)
  // ------------------------------------------------------------
  const openEdit = (u) => {
    setEditingUser(u);
    setEditError('');
    setShowEditPassword(false);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      address: u.address || '',
      role: u.role === 'customer' ? 'user' : (u.role || 'user'),
      kyc_status: u.kyc_status || 'unverified',
      email_verified: u.email_verified !== false,
      id_card_front: u.id_card_front || '',
      id_card_back: u.id_card_back || '',
      driver_license_front: u.driver_license_front || '',
      driver_license_back: u.driver_license_back || '',
      password: ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError('');
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        role: editForm.role,
        kyc_status: editForm.kyc_status,
        email_verified: editForm.email_verified,
        id_card_front: editForm.id_card_front || null,
        id_card_back: editForm.id_card_back || null,
        driver_license_front: editForm.driver_license_front || null,
        driver_license_back: editForm.driver_license_back || null
      };
      if (editForm.password && editForm.password.trim().length > 0) {
        payload.password = editForm.password;
      }

      const response = await apiFetch(`/api/components/admin/AdminUsers/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setEditError(data.error || 'Lỗi khi cập nhật thông tin tài khoản.');
        return;
      }
      setEditingUser(null);
      showToast(`Đã cập nhật tài khoản ${editForm.email} thành công!`);
      fetchUsers();
    } catch (err) {
      setEditError(err.message || 'Lỗi kết nối khi lưu thay đổi.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (window.confirm(`Xác nhận đổi quyền cho người dùng này thành ${newRole.toUpperCase()}?`)) {
      const response = await apiFetch(`/api/components/admin/AdminUsers/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        showToast(`Đã cập nhật quyền thành ${newRole.toUpperCase()}.`);
        fetchUsers();
      } else {
        alert('Lỗi khi đổi quyền');
      }
    }
  };

  const handleKycStatusChange = async (userId, kyc_status) => {
    const response = await apiFetch(`/api/components/admin/AdminUsers/${userId}/kyc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kyc_status })
    });
    if (response.ok) {
      setViewKycUser(null);
      showToast(`Đã cập nhật trạng thái KYC thành "${kyc_status.toUpperCase()}".`);
      fetchUsers();
    } else {
      alert('Lỗi khi cập nhật trạng thái KYC');
    }
  };

  // ------------------------------------------------------------
  // DELETE ACCOUNT OR ZERO-DATA RETENTION PURGE
  // ------------------------------------------------------------
  const openDeleteModal = (u, mode = 'hard') => {
    setUserToDelete(u);
    setDeleteMode(mode);
    setDeleteError('');
  };

  const confirmDeleteOrPurge = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const endpoint =
        deleteMode === 'zero'
          ? `/api/components/admin/AdminUsers/${userToDelete.id}/purge-zero`
          : `/api/components/admin/AdminUsers/${userToDelete.id}`;
      const method = deleteMode === 'zero' ? 'POST' : 'DELETE';

      const response = await apiFetch(endpoint, { method });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDeleteError(data.error || 'Lỗi khi thực hiện thao tác.');
        return;
      }
      setUserToDelete(null);
      showToast(
        data.message ||
          (deleteMode === 'zero'
            ? 'Đã xóa trắng dữ liệu nhạy cảm về Zero thành công!'
            : 'Đã xóa hoàn toàn tài khoản!')
      );
      fetchUsers();
    } catch (err) {
      setDeleteError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION • ACCOUNT & KYC MANAGEMENT</p>
          <h1>Quản lý tài khoản & Định danh KYC<span>.</span></h1>
        </div>
        <div className="users-header-actions">
          <button className="secondary" onClick={fetchUsers} disabled={loading}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <button className="primary" id="add-user-btn" onClick={openAddDialog}>
            ＋ Thêm người dùng mới
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="users-kpi-grid">
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">TỔNG TÀI KHOẢN HỆ THỐNG</div>
          <div className="users-kpi-val">{total}</div>
          <div className="users-kpi-desc is-success">Quản lý 2 chiều Admin & Khách hàng</div>
        </div>
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">ĐÃ XÁC THỰC KYC (CCCD 2 MẶT)</div>
          <div className="users-kpi-val is-success">{stats.verifiedKyc}</div>
          <div className="users-kpi-desc">Email thật, SĐT & Địa chỉ hợp lệ</div>
        </div>
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">HỒ SƠ KYC CHỜ DUYỆT</div>
          <div className="users-kpi-val is-warning">{stats.pendingKyc}</div>
          <div className="users-kpi-desc">Nhấn vào badge KYC để đối chiếu</div>
        </div>
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">NHÂN SỰ VẬN HÀNH (ADMIN / STAFF)</div>
          <div className="users-kpi-val is-info">{stats.staffAndAdmin}</div>
          <div className={`users-kpi-desc ${stats.pendingStaffConfirm > 0 ? 'is-warning' : 'is-success'}`}>
            {stats.pendingStaffConfirm > 0
              ? `⏳ ${stats.pendingStaffConfirm} nhân viên đang chờ xác nhận Email`
              : '✓ 100% Nhân viên đã xác nhận Email sử dụng'}
          </div>
        </div>
      </div>

      {/* Main CRUD Panel */}
      <div className="panel">
        {error && <p className="error" role="alert">{error}</p>}
        {successMsg && (
          <div className="users-toast">
            ✓ {successMsg}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="users-filter-bar">
          <div className="users-search-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Tìm kiếm theo Họ tên, Email, Số điện thoại, Địa chỉ..."
              className="users-input"
            />
          </div>
          <div className="users-filter-selects">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="users-role-select"
            >
              <option value="all">Tất cả quyền (Roles)</option>
              <option value="user">Khách hàng (USER)</option>
              <option value="staff">Nhân viên (STAFF)</option>
              <option value="admin">Quản trị viên (ADMIN)</option>
            </select>

            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="users-role-select"
            >
              <option value="all">Tất cả trạng thái KYC</option>
              <option value="verified">✓ Đã duyệt KYC</option>
              <option value="pending">🔍 Chờ duyệt KYC</option>
              <option value="rejected">✕ Từ chối KYC</option>
              <option value="unverified">Chưa nộp KYC</option>
            </select>

            {(searchQuery || roleFilter !== 'all' || kycFilter !== 'all') && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setKycFilter('all');
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Họ và Tên & Email</th>
              <th>SĐT & Địa chỉ cư trú</th>
              <th>Phân quyền</th>
              <th>Hồ sơ KYC & CCCD 2 mặt</th>
              <th>Ngày tạo</th>
              <th>Thao tác CRUD</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, idx) => (
              <tr key={u.id}>
                <td className="users-col-stt">
                  {(page - 1) * pageSize + idx + 1}
                </td>
                <td>
                  <div className="users-name users-name-heading">
                    {u.name || 'Chưa cập nhật'}{' '}
                    {session?.user?.id === u.id && (
                      <span className="users-self-tag">(Bạn)</span>
                    )}
                  </div>
                  <div className="users-sub-email">{u.email || '-'}</div>
                  <div className="users-status-wrap">
                    {u.role === 'staff' ? (
                      u.staff_confirmation_status === 'pending' || u.email_verified === false ? (
                        <div className="users-staff-pending-box">
                          <div className="users-staff-pending-title">
                            ⏳ Nhân viên chờ xác nhận Email (Chưa kích hoạt)
                          </div>
                          {u.dev_otp_preview && (
                            <div className="users-staff-pending-otp">
                              Mã OTP gửi vào mail: <b>{u.dev_otp_preview}</b>
                            </div>
                          )}
                          <div className="users-staff-pending-actions">
                            <button
                              type="button"
                              onClick={() => openStaffConfirmModal(u)}
                              className="users-staff-btn-confirm"
                            >
                              ✓ Xác nhận mã Mail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResendStaffConfirm(u)}
                              className="users-staff-btn-resend"
                            >
                              📩 Gửi lại mail
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="users-staff-confirmed-badge">
                          ✅ Nhân viên đã xác nhận Email (Đang sử dụng)
                          {u.staff_confirmed_at && (
                            <span className="users-staff-confirmed-time">
                              • {new Date(u.staff_confirmed_at).toLocaleTimeString('vi-VN')}
                            </span>
                          )}
                        </div>
                      )
                    ) : u.email_verified !== false ? (
                      <span className="users-email-verified-badge">✓ Email thật đã xác thực</span>
                    ) : (
                      <span className="users-email-unverified-badge">⚠ Chưa xác thực email</span>
                    )}
                  </div>
                </td>
                <td className="users-contact-cell">
                  <div>📞 <b>{u.phone || 'Chưa cập nhật'}</b></div>
                  <div className="users-contact-address">🏠 {u.address || 'Chưa cập nhật'}</div>
                </td>
                <td>
                  <select
                    value={u.role === 'customer' ? 'user' : (u.role || 'user')}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className={`users-role-select ${
                      u.role === 'admin' ? 'is-admin' : u.role === 'staff' ? 'is-staff' : 'is-user'
                    }`}
                    disabled={session?.user?.id === u.id}
                  >
                    <option value="user">USER</option>
                    <option value="staff">STAFF</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </td>
                <td>
                  <div className="users-kyc-wrap">
                    <span
                      onClick={() => setViewKycUser(u)}
                      className={`users-kyc-badge ${u.kyc_status || 'unverified'}`}
                      title="Nhấn để xem và duyệt hồ sơ CCCD & GPLX"
                    >
                      {u.kyc_status === 'verified'
                        ? '✓ Đã duyệt KYC'
                        : u.kyc_status === 'pending'
                        ? '🔍 Chờ duyệt KYC'
                        : u.kyc_status === 'rejected'
                        ? '✕ Từ chối KYC'
                        : 'Chưa nộp KYC'}
                    </span>
                    <span className="users-kyc-cccd-sub">
                      🪪 CCCD:{' '}
                      {u.id_card_front && u.id_card_back
                        ? 'Đủ 2 mặt'
                        : u.id_card_front || u.id_card_back
                        ? '1 mặt'
                        : 'Chưa tải'}
                    </span>
                    <span className="users-kyc-cccd-sub">
                      🚗 GPLX:{' '}
                      {u.driver_license_front && u.driver_license_back
                        ? 'Đủ 2 mặt'
                        : u.driver_license_front || u.driver_license_back
                        ? '1 mặt'
                        : 'Chưa tải'}
                    </span>
                  </div>
                </td>
                <td className="users-col-date">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-'}
                </td>
                <td>
                  <div className="users-actions-wrap">
                    <button
                      onClick={() => openDetailModal(u)}
                      className="text-button users-action-button"
                      title="Xem hồ sơ 360° (Xe, Ô đỗ cố định, Thanh toán)"
                    >
                      👁️ Chi tiết
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="text-button users-action-button"
                      title="Chỉnh sửa toàn bộ thông tin tài khoản, KYC, CCCD & Mật khẩu"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => openDeleteModal(u, 'zero')}
                      className="text-button users-action-button users-action-btn-zero"
                      disabled={session?.user?.id === u.id}
                      title="Xóa sạch SĐT, Địa chỉ, CCCD về trạng thái Zero (Giữ tài khoản)"
                    >
                      🧹 Zero-Data
                    </button>
                    <button
                      onClick={() => openDeleteModal(u, 'hard')}
                      className="text-button error users-action-button"
                      disabled={session?.user?.id === u.id}
                      id={`delete-user-${u.id}`}
                      title={
                        session?.user?.id === u.id
                          ? 'Không thể tự xóa tài khoản của chính mình'
                          : 'Xóa vĩnh viễn tài khoản khỏi hệ thống'
                      }
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="7" className="users-empty">
                  Không tìm thấy tài khoản nào khớp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </div>

      {/* ============================================================ */}
      {/* 1. FULL EDIT ACCOUNT MODAL (UPDATE ALL FIELDS)               */}
      {/* ============================================================ */}
      {editingUser && (
        <div className="dialog-overlay" onClick={() => !editLoading && setEditingUser(null)}>
          <div
            className="dialog-content users-dialog-edit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-dialog-header">
              <h3 className="users-dialog-title">
                ✏️ Cập nhật toàn diện tài khoản: {editingUser.name || editingUser.email}
              </h3>
              <button className="slot-info-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            {editError && <p className="error" role="alert">{editError}</p>}

            <form onSubmit={handleSaveEdit}>
              <div className="users-form-grid-2col">
                <label className="users-name-field">
                  Họ và tên <span className="users-required">*</span>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="users-input"
                    required
                  />
                </label>

                <label className="users-email-field">
                  Email liên hệ (Email thật) <span className="users-required">*</span>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="users-input"
                    required
                  />
                </label>

                <label className="users-name-field">
                  Số điện thoại
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="users-input"
                    placeholder="0901234567"
                  />
                </label>

                <label className="users-name-field">
                  Địa chỉ cư trú
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="users-input"
                    placeholder="Căn hộ 1205, Tòa HT Tower..."
                  />
                </label>

                <label className="users-role-field">
                  Phân quyền (Role)
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className="users-role-select users-w-full"
                    disabled={session?.user?.id === editingUser.id}
                  >
                    <option value="user">USER – Khách hàng gửi xe</option>
                    <option value="staff">STAFF – Nhân viên vận hành</option>
                    <option value="admin">ADMIN – Quản trị viên</option>
                  </select>
                </label>

                <label className="users-role-field">
                  Trạng thái xác thực KYC
                  <select
                    value={editForm.kyc_status}
                    onChange={(e) => setEditForm((f) => ({ ...f, kyc_status: e.target.value }))}
                    className="users-role-select users-w-full"
                  >
                    <option value="verified">✓ Đã duyệt hợp lệ (verified)</option>
                    <option value="pending">🔍 Đang chờ duyệt (pending)</option>
                    <option value="unverified">Chưa nộp hồ sơ (unverified)</option>
                    <option value="rejected">✕ Từ chối hồ sơ (rejected)</option>
                  </select>
                </label>
              </div>

              {/* Email Verified Checkbox & Optional Password Reset */}
              <div className="users-dialog-meta-box">
                <label className="users-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.email_verified}
                    onChange={(e) => setEditForm((f) => ({ ...f, email_verified: e.target.checked }))}
                  />
                  Đánh dấu Email thật đã xác thực (OTP/Link)
                </label>

                <div>
                  <label className="users-password-label">
                    Đặt lại mật khẩu mới (Để trống nếu giữ nguyên)
                  </label>
                  <div className="users-password-wrap">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editForm.password}
                      onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                      className="users-input"
                      placeholder="Nhập mật khẩu mới (>= 8 ký tự)"
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="users-pw-toggle"
                      onClick={() => setShowEditPassword((v) => !v)}
                    >
                      {showEditPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Document Management inside Edit Dialog: BOTH CCCD & GPLX */}
              <div className="users-cccd-section">
                <div className="users-cccd-header">
                  <div className="users-cccd-header-title">
                    🪪 Hồ sơ Định danh: Căn cước công dân (CCCD) & Giấy phép lái xe (GPLX)
                  </div>
                  <div className="users-cccd-btn-wrap">
                    <button
                      type="button"
                      className="secondary"
                      style={{ background: '#0284c7', color: '#fff', border: 'none', fontWeight: 700 }}
                      onClick={() => {
                        const s = SAMPLE_KYC_PROFILES[0];
                        const targetName = editForm.name.trim() || s.name;
                        const targetAddress = editForm.address.trim() || s.address;
                        setEditForm((f) => ({
                          ...f,
                          name: targetName,
                          phone: f.phone.trim() || s.phone,
                          address: targetAddress,
                          kyc_status: 'verified',
                          email_verified: true,
                          id_card_front: buildSampleCccdFront({
                            name: targetName,
                            cccdNo: s.cccdNo,
                            dob: s.dob,
                            sex: s.sex,
                            origin: s.origin,
                            address: targetAddress
                          }),
                          id_card_back: buildSampleCccdBack({
                            name: targetName,
                            cccdNo: s.cccdNo,
                            feature: s.feature
                          }),
                          driver_license_front: buildSampleGplxFront({
                            name: targetName,
                            gplxNo: s.gplxNo || '790195008868',
                            dob: s.dob,
                            address: targetAddress,
                            licenseClass: s.licenseClass || 'B2'
                          }),
                          driver_license_back: buildSampleGplxBack({
                            gplxNo: s.gplxNo || '790195008868'
                          })
                        }));
                      }}
                    >
                      ✨ Tạo đủ cả CCCD & GPLX (4 mặt)
                    </button>
                    <button
                      type="button"
                      className="secondary users-sample-btn-cccd"
                      onClick={() => {
                        const s = SAMPLE_KYC_PROFILES[0];
                        const targetName = editForm.name.trim() || s.name;
                        const targetAddress = editForm.address.trim() || s.address;
                        setEditForm((f) => ({
                          ...f,
                          name: targetName,
                          phone: f.phone.trim() || s.phone,
                          address: targetAddress,
                          kyc_status: 'verified',
                          email_verified: true,
                          id_card_front: buildSampleCccdFront({
                            name: targetName,
                            cccdNo: s.cccdNo,
                            dob: s.dob,
                            sex: s.sex,
                            origin: s.origin,
                            address: targetAddress
                          }),
                          id_card_back: buildSampleCccdBack({
                            name: targetName,
                            cccdNo: s.cccdNo,
                            feature: s.feature
                          })
                        }));
                      }}
                    >
                      🪪 Mẫu CCCD 2 mặt
                    </button>
                    <button
                      type="button"
                      className="secondary users-sample-btn-gplx"
                      onClick={() => {
                        const s = SAMPLE_KYC_PROFILES[0];
                        const targetName = editForm.name.trim() || s.name;
                        const targetAddress = editForm.address.trim() || s.address;
                        setEditForm((f) => ({
                          ...f,
                          name: targetName,
                          phone: f.phone.trim() || s.phone,
                          address: targetAddress,
                          kyc_status: 'verified',
                          email_verified: true,
                          driver_license_front: buildSampleGplxFront({
                            name: targetName,
                            gplxNo: s.gplxNo || '790195008868',
                            dob: s.dob,
                            address: targetAddress,
                            licenseClass: s.licenseClass || 'B2'
                          }),
                          driver_license_back: buildSampleGplxBack({
                            gplxNo: s.gplxNo || '790195008868'
                          })
                        }));
                      }}
                    >
                      🚗 Mẫu GPLX 2 mặt
                    </button>
                  </div>
                </div>

                {/* Section 1: CCCD 2 mặt */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    1. Căn cước công dân (CCCD):
                  </div>
                  <div className="users-cccd-grid">
                    <div className="users-cccd-box">
                      <div className="users-cccd-title">CCCD Mặt trước</div>
                      {editForm.id_card_front ? (
                        <div className="users-cccd-preview-wrap">
                          <img
                            src={editForm.id_card_front}
                            alt="CCCD Mặt trước"
                            className="users-cccd-img"
                          />
                          <button
                            type="button"
                            className="text-button error users-cccd-del-btn"
                            onClick={() => setEditForm((f) => ({ ...f, id_card_front: '' }))}
                          >
                            Xóa ảnh mặt trước
                          </button>
                        </div>
                      ) : (
                        <div className="users-cccd-empty">Chưa có ảnh CCCD trước</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="users-cccd-file-input"
                        onChange={(e) =>
                          handleImageFile(e.target.files?.[0], (base64) =>
                            setEditForm((f) => ({ ...f, id_card_front: base64 }))
                          )
                        }
                      />
                    </div>

                    <div className="users-cccd-box">
                      <div className="users-cccd-title">CCCD Mặt sau</div>
                      {editForm.id_card_back ? (
                        <div className="users-cccd-preview-wrap">
                          <img
                            src={editForm.id_card_back}
                            alt="CCCD Mặt sau"
                            className="users-cccd-img"
                          />
                          <button
                            type="button"
                            className="text-button error users-cccd-del-btn"
                            onClick={() => setEditForm((f) => ({ ...f, id_card_back: '' }))}
                          >
                            Xóa ảnh mặt sau
                          </button>
                        </div>
                      ) : (
                        <div className="users-cccd-empty">Chưa có ảnh CCCD sau</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="users-cccd-file-input"
                        onChange={(e) =>
                          handleImageFile(e.target.files?.[0], (base64) =>
                            setEditForm((f) => ({ ...f, id_card_back: base64 }))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: GPLX 2 mặt */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    2. Giấy phép lái xe (GPLX):
                  </div>
                  <div className="users-cccd-grid">
                    <div className="users-cccd-box">
                      <div className="users-cccd-title">GPLX Mặt trước (Thẻ PET)</div>
                      {editForm.driver_license_front ? (
                        <div className="users-cccd-preview-wrap">
                          <img
                            src={editForm.driver_license_front}
                            alt="GPLX Mặt trước"
                            className="users-cccd-img"
                          />
                          <button
                            type="button"
                            className="text-button error users-cccd-del-btn"
                            onClick={() => setEditForm((f) => ({ ...f, driver_license_front: '' }))}
                          >
                            Xóa ảnh GPLX trước
                          </button>
                        </div>
                      ) : (
                        <div className="users-cccd-empty">Chưa có ảnh GPLX trước</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="users-cccd-file-input"
                        onChange={(e) =>
                          handleImageFile(e.target.files?.[0], (base64) =>
                            setEditForm((f) => ({ ...f, driver_license_front: base64 }))
                          )
                        }
                      />
                    </div>

                    <div className="users-cccd-box">
                      <div className="users-cccd-title">GPLX Mặt sau (Hạng xe)</div>
                      {editForm.driver_license_back ? (
                        <div className="users-cccd-preview-wrap">
                          <img
                            src={editForm.driver_license_back}
                            alt="GPLX Mặt sau"
                            className="users-cccd-img"
                          />
                          <button
                            type="button"
                            className="text-button error users-cccd-del-btn"
                            onClick={() => setEditForm((f) => ({ ...f, driver_license_back: '' }))}
                          >
                            Xóa ảnh GPLX sau
                          </button>
                        </div>
                      ) : (
                        <div className="users-cccd-empty">Chưa có ảnh GPLX sau</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="users-cccd-file-input"
                        onChange={(e) =>
                          handleImageFile(e.target.files?.[0], (base64) =>
                            setEditForm((f) => ({ ...f, driver_license_back: base64 }))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="users-dialog-actions users-dialog-actions-mt">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={editLoading}
                >
                  Hủy
                </button>
                <button type="submit" className="primary" disabled={editLoading}>
                  {editLoading ? 'Đang lưu...' : '💾 Lưu toàn bộ thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ADD NEW USER DIALOG (CREATE FULL ACCOUNT)                 */}
      {/* ============================================================ */}
      {showAddDialog && (
        <div className="dialog-overlay" onClick={() => !addLoading && setShowAddDialog(false)}>
          <div
            className="dialog-content users-dialog-add"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="users-dialog-title">＋ Thêm tài khoản người dùng mới</h3>
            <p className="users-dialog-desc">
              Tạo nhanh tài khoản Khách hàng, Nhân viên hoặc Quản trị viên với đầy đủ thông tin liên hệ và KYC.
            </p>
            <div className="users-sample-bar">
              <span className="users-sample-bar-label">
                🪪 Điền nhanh dữ liệu & ảnh CCCD 2 mặt mẫu:
              </span>
              <div className="users-sample-bar-buttons">
                {SAMPLE_KYC_PROFILES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="secondary users-sample-btn-pill"
                    onClick={() =>
                      setAddForm((f) => ({
                        ...f,
                        name: s.name,
                        email: s.email,
                        password: f.password || 'Parking@123',
                        phone: s.phone,
                        address: s.address,
                        kyc_status: 'verified',
                        id_card_front: buildSampleCccdFront({
                          name: s.name,
                          cccdNo: s.cccdNo,
                          dob: s.dob,
                          sex: s.sex,
                          origin: s.origin,
                          address: s.address
                        }),
                        id_card_back: buildSampleCccdBack({
                          name: s.name,
                          cccdNo: s.cccdNo,
                          feature: s.feature
                        }),
                        driver_license_front: buildSampleGplxFront({
                          name: s.name,
                          gplxNo: s.gplxNo || '790195008868',
                          dob: s.dob,
                          address: s.address,
                          licenseClass: s.licenseClass || 'B2'
                        }),
                        driver_license_back: buildSampleGplxBack({
                          gplxNo: s.gplxNo || '790195008868'
                        })
                      }))
                    }
                  >
                    ⚡ Mẫu {idx + 1}: {s.name} (Đủ CCCD & GPLX)
                  </button>
                ))}
              </div>
            </div>
            {addError && <p className="error" role="alert">{addError}</p>}
            <form onSubmit={handleAddUser}>
              <div className="users-form-grid-2col">
                <label className="users-name-field">
                  Họ và tên <span className="users-required">*</span>
                  <input
                    id="new-user-name"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    className="users-input"
                    placeholder="Nguyễn Văn A"
                    required
                    autoFocus
                  />
                </label>

                <label className="users-email-field">
                  Email thật <span className="users-required">*</span>
                  <input
                    id="new-user-email"
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    className="users-input"
                    placeholder="example@email.com"
                    required
                  />
                </label>

                <label className="users-name-field">
                  Số điện thoại
                  <input
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    className="users-input"
                    placeholder="0901234567"
                  />
                </label>

                <label className="users-name-field">
                  Địa chỉ cư trú
                  <input
                    value={addForm.address}
                    onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                    className="users-input"
                    placeholder="Tòa nhà HT Tower, Quận 1..."
                  />
                </label>

                <label className="users-password-field">
                  Mật khẩu khởi tạo <span className="users-required">*</span>
                  <div className="users-password-wrap">
                    <input
                      id="new-user-password"
                      type={showPassword ? 'text' : 'password'}
                      value={addForm.password}
                      onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                      className="users-input"
                      placeholder="Tối thiểu 8 ký tự"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="users-pw-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <label className="users-role-field">
                  Quyền truy cập (Role)
                  <select
                    id="new-user-role"
                    value={addForm.role}
                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                    className={`users-role-select users-w-full ${
                      addForm.role === 'admin' ? 'is-admin' : addForm.role === 'staff' ? 'is-staff' : 'is-user'
                    }`}
                  >
                    <option value="user">USER – Khách hàng thông thường</option>
                    <option value="staff">STAFF – Nhân viên bãi xe (Cần xác nhận qua Email)</option>
                    <option value="admin">ADMIN – Quản trị viên</option>
                  </select>
                </label>
              </div>

              {addForm.role === 'staff' && (
                <div className="users-staff-notice-box">
                  <strong>📧 Yêu cầu xác nhận Email thật đối với Nhân viên (STAFF):</strong>
                  <div className="users-notice-body">
                    Khi Admin thêm tài khoản Nhân viên, hệ thống sẽ kiểm tra tính hợp lệ của <b>Email thật</b> và gửi thư xác nhận kích hoạt (kèm đường dẫn xác nhận & mã OTP 6 chữ số) tới hộp thư của nhân viên.
                    Tài khoản sẽ hiển thị trạng thái <b>“⏳ Nhân viên chờ xác nhận Email”</b> cho tới khi nhân viên xác nhận sử dụng tài khoản.
                  </div>
                </div>
              )}

              {/* CCCD & GPLX Upload section for Add Form */}
              <div style={{ marginTop: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  🪪 Hồ sơ Giấy tờ: CCCD & GPLX (Tùy chọn tải trước):
                </div>
                <div className="users-add-cccd-grid">
                  <label className="users-add-cccd-label">
                    Ảnh CCCD Mặt trước
                    <input
                      type="file"
                      accept="image/*"
                      className="users-add-cccd-input"
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (base64) =>
                          setAddForm((f) => ({ ...f, id_card_front: base64 }))
                        )
                      }
                    />
                  </label>
                  <label className="users-add-cccd-label">
                    Ảnh CCCD Mặt sau
                    <input
                      type="file"
                      accept="image/*"
                      className="users-add-cccd-input"
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (base64) =>
                          setAddForm((f) => ({ ...f, id_card_back: base64 }))
                        )
                      }
                    />
                  </label>
                  <label className="users-add-cccd-label">
                    Ảnh GPLX Mặt trước (Thẻ PET)
                    <input
                      type="file"
                      accept="image/*"
                      className="users-add-cccd-input"
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (base64) =>
                          setAddForm((f) => ({ ...f, driver_license_front: base64 }))
                        )
                      }
                    />
                  </label>
                  <label className="users-add-cccd-label">
                    Ảnh GPLX Mặt sau (Hạng xe)
                    <input
                      type="file"
                      accept="image/*"
                      className="users-add-cccd-input"
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (base64) =>
                          setAddForm((f) => ({ ...f, driver_license_back: base64 }))
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="users-dialog-actions users-dialog-actions-mt">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAddDialog(false)}
                  disabled={addLoading}
                >
                  Hủy
                </button>
                <button type="submit" className="primary" id="add-user-submit" disabled={addLoading}>
                  {addLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. 360° ACCOUNT DETAILS MODAL (VEHICLES + SLOTS + PAYMENTS)  */}
      {/* ============================================================ */}
      {detailUser && (
        <div className="dialog-overlay" onClick={() => setDetailUser(null)}>
          <div
            className="dialog-content users-dialog-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-dialog-header">
              <h3 className="users-dialog-title">
                👁️ Hồ sơ 360° Tài khoản: {detailUser.name || detailUser.email}
              </h3>
              <button className="slot-info-close" onClick={() => setDetailUser(null)}>✕</button>
            </div>

            {detailLoading ? (
              <div className="users-detail-loading">
                Đang tải dữ liệu phương tiện, vị trí đỗ cố định và lịch sử gói thuê...
              </div>
            ) : (
              <div className="users-detail-body">
                {/* Profile Summary */}
                <div className="users-detail-profile-grid">
                  <div><b>Họ và tên:</b> {detailData?.profile?.name || detailUser.name || '-'}</div>
                  <div><b>Email:</b> {detailData?.profile?.email || detailUser.email || '-'}</div>
                  <div><b>Số điện thoại:</b> {detailData?.profile?.phone || detailUser.phone || 'Chưa cập nhật'}</div>
                  <div><b>Địa chỉ:</b> {detailData?.profile?.address || detailUser.address || 'Chưa cập nhật'}</div>
                  <div><b>Phân quyền:</b> {(detailData?.profile?.role || detailUser.role || 'user').toUpperCase()}</div>
                  <div><b>Trạng thái KYC:</b> {(detailData?.profile?.kyc_status || detailUser.kyc_status || 'unverified').toUpperCase()}</div>
                </div>

                {/* Vehicles & Fixed Parking Slots (1 Slot = 1 Xe) */}
                <div className="users-detail-split-grid">
                  <div className="users-detail-card">
                    <div className="users-detail-card-title">
                      🚗 Phương tiện đã đăng ký ({detailData?.vehicles?.length || 0})
                    </div>
                    {detailData?.vehicles?.length ? (
                      <ul className="users-detail-list">
                        {detailData.vehicles.map((v) => (
                          <li key={v.id}>
                            <b>{v.license_plate}</b> ({v.type === 'car' ? 'Ô tô' : 'Xe máy'})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="users-detail-empty">Chưa đăng ký phương tiện nào.</div>
                    )}
                  </div>

                  <div className="users-detail-card">
                    <div className="users-detail-card-title">
                      🅿️ Ô đỗ cố định đang giữ (1 Slot = 1 Xe) ({detailData?.slots?.length || 0})
                    </div>
                    {detailData?.slots?.length ? (
                      <ul className="users-detail-list">
                        {detailData.slots.map((s) => (
                          <li key={s.id}>
                            Ô <b>{s.id}</b> • Trạng thái: <b className="users-detail-active">{s.status}</b>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="users-detail-empty">Chưa giữ ô đỗ cố định nào.</div>
                    )}
                  </div>
                </div>

                {/* Recent Transactions & Subscription Cycle */}
                <div className="users-detail-card">
                  <div className="users-detail-card-title">
                    💳 Lịch sử Thanh toán & Chu kỳ Gói thuê gần nhất
                  </div>
                  {detailData?.transactions?.length ? (
                    <table className="data-table users-tx-table">
                      <thead>
                        <tr>
                          <th>Mã GD</th>
                          <th>Số tiền</th>
                          <th>Chu kỳ thuê (Bắt đầu → Kết thúc)</th>
                          <th>Ngày duyệt</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>#{String(tx.id).slice(0, 8)}</td>
                            <td className="users-tx-amount">{Number(tx.amount || 0).toLocaleString('vi-VN')}đ</td>
                            <td>
                              {tx.cycle_start
                                ? `${new Date(tx.cycle_start).toLocaleDateString('vi-VN')} → ${
                                    tx.cycle_end ? new Date(tx.cycle_end).toLocaleDateString('vi-VN') : '-'
                                  }`
                                : 'Theo gói tháng'}
                            </td>
                            <td>
                              {tx.confirmed_at ? new Date(tx.confirmed_at).toLocaleString('vi-VN') : 'Chờ duyệt'}
                            </td>
                            <td>
                              <span className={`users-tx-status ${tx.status === 'completed' ? 'is-completed' : 'is-pending'}`}>
                                {tx.status === 'completed' ? '✓ Đã kích hoạt' : tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="users-detail-empty">Chưa phát sinh giao dịch thanh toán nào.</div>
                  )}
                </div>

                <div className="users-dialog-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      const target = detailUser;
                      setDetailUser(null);
                      openEdit(target);
                    }}
                  >
                    ✏️ Chỉnh sửa tài khoản này
                  </button>
                  <button type="button" className="primary" onClick={() => setDetailUser(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DELETE / ZERO-DATA RETENTION CONFIRMATION DIALOG          */}
      {/* ============================================================ */}
      {userToDelete && (
        <div className="dialog-overlay" onClick={() => !deleteLoading && setUserToDelete(null)}>
          <div className="dialog-content sm" onClick={(e) => e.stopPropagation()}>
            <h3
              className={`users-dialog-title ${deleteMode === 'zero' ? 'users-delete-title-zero' : 'users-delete-title-hard'}`}
            >
              {deleteMode === 'zero'
                ? '🧹 Xác nhận Xóa dữ liệu nhạy cảm về Zero (Zero-Data Retention)'
                : '🗑️ Xác nhận Xóa vĩnh viễn tài khoản'}
            </h3>
            <p className="users-dialog-desc">
              Tài khoản mục tiêu: <b>{userToDelete.name || userToDelete.email}</b> ({userToDelete.email})
            </p>
            <div className={`users-delete-alert ${deleteMode}`}>
              {deleteMode === 'zero' ? (
                <>
                  🔒 <b>Chế độ Zero-Data Retention:</b> Hệ thống sẽ xóa trắng Số điện thoại, Địa chỉ, ảnh CCCD 2 mặt về trạng thái <b>Zero (Null)</b> và giải phóng ô đỗ cố định, nhưng vẫn giữ lại tài khoản cơ bản để đối soát lịch sử.
                </>
              ) : (
                <>
                  ⚠️ <b>Xóa hoàn toàn (Hard Delete + Zero-Data):</b> Thao tác này sẽ xóa sạch dữ liệu nhạy cảm, giải phóng mọi phương tiện/ô đỗ liên quan và xóa vĩnh viễn tài khoản khỏi hệ thống. Không thể hoàn tác.
                </>
              )}
            </div>

            {deleteError && <p className="error" role="alert">{deleteError}</p>}

            <div className="users-dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setUserToDelete(null)}
                disabled={deleteLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`primary users-delete-confirm-btn ${deleteMode}`}
                onClick={confirmDeleteOrPurge}
                disabled={deleteLoading}
                id="confirm-delete-user-btn"
              >
                {deleteLoading
                  ? 'Đang xử lý...'
                  : deleteMode === 'zero'
                  ? 'Xác nhận Reset về Zero'
                  : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. KYC QUICK INSPECTION MODAL (BOTH CCCD & GPLX)             */}
      {/* ============================================================ */}
      {viewKycUser && (
        <div className="slot-picker-overlay users-kyc-overlay">
          <div className="slot-picker-dialog users-kyc-dialog" style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="users-dialog-header">
              <h3>Đối chiếu Hồ sơ Định danh CCCD & GPLX: {viewKycUser.name}</h3>
              <button className="slot-info-close" onClick={() => setViewKycUser(null)}>✕</button>
            </div>
            <div className="users-kyc-dialog-info">
              <div><strong>Email:</strong> {viewKycUser.email}</div>
              <div><strong>Số điện thoại:</strong> {viewKycUser.phone || '(Chưa cung cấp)'}</div>
              <div><strong>Địa chỉ cư trú:</strong> {viewKycUser.address || '(Chưa cung cấp)'}</div>
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <span style={{ color: viewKycUser.id_card_front && viewKycUser.id_card_back ? '#059669' : '#dc2626', fontWeight: 700, marginRight: '14px' }}>
                  🪪 CCCD: {viewKycUser.id_card_front && viewKycUser.id_card_back ? '✓ Đủ 2 mặt' : viewKycUser.id_card_front || viewKycUser.id_card_back ? '⚠ Thiếu 1 mặt' : '✕ Chưa nộp'}
                </span>
                <span style={{ color: viewKycUser.driver_license_front && viewKycUser.driver_license_back ? '#059669' : '#dc2626', fontWeight: 700 }}>
                  🚗 GPLX: {viewKycUser.driver_license_front && viewKycUser.driver_license_back ? '✓ Đủ 2 mặt' : viewKycUser.driver_license_front || viewKycUser.driver_license_back ? '⚠ Thiếu 1 mặt' : '✕ Chưa nộp'}
                </span>
              </div>
            </div>

            {/* Document 1: CCCD */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                🪪 1. Căn cước công dân (CCCD - 2 mặt):
              </div>
              <div className="users-kyc-dialog-grid">
                <div className="users-kyc-img-box">
                  <div className="users-kyc-img-title">Ảnh CCCD Mặt trước</div>
                  {viewKycUser.id_card_front ? (
                    <img
                      src={viewKycUser.id_card_front}
                      alt="CCCD trước"
                      className="users-kyc-img"
                    />
                  ) : (
                    <div className="users-kyc-empty">Chưa tải lên</div>
                  )}
                </div>
                <div className="users-kyc-img-box">
                  <div className="users-kyc-img-title">Ảnh CCCD Mặt sau</div>
                  {viewKycUser.id_card_back ? (
                    <img
                      src={viewKycUser.id_card_back}
                      alt="CCCD sau"
                      className="users-kyc-img"
                    />
                  ) : (
                    <div className="users-kyc-empty">Chưa tải lên</div>
                  )}
                </div>
              </div>
            </div>

            {/* Document 2: GPLX */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                🚗 2. Giấy phép lái xe (GPLX - 2 mặt):
              </div>
              <div className="users-kyc-dialog-grid">
                <div className="users-kyc-img-box">
                  <div className="users-kyc-img-title">Ảnh GPLX Mặt trước (Thẻ PET)</div>
                  {viewKycUser.driver_license_front ? (
                    <img
                      src={viewKycUser.driver_license_front}
                      alt="GPLX trước"
                      className="users-kyc-img"
                    />
                  ) : (
                    <div className="users-kyc-empty">Chưa tải lên</div>
                  )}
                </div>
                <div className="users-kyc-img-box">
                  <div className="users-kyc-img-title">Ảnh GPLX Mặt sau (Hạng xe)</div>
                  {viewKycUser.driver_license_back ? (
                    <img
                      src={viewKycUser.driver_license_back}
                      alt="GPLX sau"
                      className="users-kyc-img"
                    />
                  ) : (
                    <div className="users-kyc-empty">Chưa tải lên</div>
                  )}
                </div>
              </div>
            </div>

            <div className="users-kyc-actions">
              <button
                className="secondary"
                onClick={() => {
                  const target = viewKycUser;
                  setViewKycUser(null);
                  openEdit(target);
                }}
              >
                ✏️ Sửa thông tin / Tải ảnh CCCD & GPLX
              </button>
              <div className="users-kyc-action-group">
                <button
                  className="secondary users-kyc-btn-reject"
                  onClick={() => handleKycStatusChange(viewKycUser.id, 'rejected')}
                >
                  ✕ Từ chối KYC
                </button>
                <button
                  className="primary users-kyc-btn-approve"
                  onClick={() => handleKycStatusChange(viewKycUser.id, 'verified')}
                >
                  ✓ Duyệt Hợp Lệ (CCCD & GPLX)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. STAFF EMAIL CONFIRMATION MODAL                            */}
      {/* ============================================================ */}
      {staffConfirmModalUser && (
        <div className="dialog-overlay" onClick={() => !staffConfirmLoading && setStaffConfirmModalUser(null)}>
          <div
            className="dialog-content users-staff-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-dialog-header">
              <h3 className="users-dialog-title">
                📧 Xác nhận Email Kích hoạt Tài khoản Nhân viên
              </h3>
              <button className="slot-info-close" onClick={() => setStaffConfirmModalUser(null)}>✕</button>
            </div>

            <div className="users-staff-confirm-card">
              <div>
                <strong>Nhân viên:</strong> {staffConfirmModalUser.name || 'Nhân viên mới'} ({staffConfirmModalUser.email})
              </div>
              <div className="users-notice-body">
                Hệ thống đã gửi thư xác nhận kích hoạt tới hộp thư thật <b>{staffConfirmModalUser.email}</b>. Nhân viên có thể:
              </div>
              <ol className="users-staff-confirm-list">
                <li>Nhấn trực tiếp vào đường dẫn xác nhận trong Email, <b>HOẶC</b></li>
                <li>Nhập mã OTP 6 chữ số trong Email vào ô dưới đây (hoặc khi nhân viên đăng nhập vào Cổng Nhân viên).</li>
              </ol>
              {staffConfirmModalUser.dev_otp_preview && (
                <div className="users-staff-otp-box">
                  <div className="users-staff-otp-label">
                    MÃ OTP TRONG EMAIL GỬI TỚI NHÂN VIÊN:
                  </div>
                  <div className="users-staff-otp-code">
                    {staffConfirmModalUser.dev_otp_preview}
                  </div>
                  {staffConfirmModalUser.confirm_url && (
                    <div className="users-staff-otp-link-wrap">
                      <a
                        href={staffConfirmModalUser.confirm_url}
                        target="_blank"
                        rel="noreferrer"
                        className="users-staff-otp-link"
                      >
                        🔗 Mở Link xác nhận trong Email của Nhân viên (Tab mới)
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {staffConfirmError && (
              <p className="error" role="alert">
                {staffConfirmError}
              </p>
            )}

            <form onSubmit={handleConfirmStaffOtpSubmit}>
              <label className="users-staff-otp-input-label">
                Nhập mã OTP 6 chữ số từ Email của Nhân viên *
                <input
                  type="text"
                  value={staffOtpInput}
                  onChange={(e) => setStaffOtpInput(e.target.value)}
                  placeholder="Nhập 6 chữ số (VD: 123456)"
                  maxLength={8}
                  required
                  className="users-staff-otp-input users-input"
                />
              </label>

              <div className="users-dialog-actions users-dialog-actions-mt16">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setStaffConfirmModalUser(null)}
                >
                  Để nhân viên tự xác nhận sau
                </button>
                <button type="submit" className="primary" disabled={staffConfirmLoading}>
                  {staffConfirmLoading ? 'Đang xác nhận...' : '✓ Xác nhận kích hoạt tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
