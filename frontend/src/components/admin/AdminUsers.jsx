import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '../shared/Pagination';
import { readPage } from '../../lib/pagination';
import { SAMPLE_KYC_PROFILES, buildSampleCccdFront, buildSampleCccdBack } from '../../lib/sampleKyc';

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
  id_card_back: ''
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
    return { totalLoaded, verifiedKyc, pendingKyc, staffAndAdmin };
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
      setAddForm(EMPTY_ADD_FORM);
      showToast(`Đã tạo tài khoản ${addForm.email} thành công!`);
      fetchUsers();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
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
        id_card_back: editForm.id_card_back || null
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="secondary" onClick={fetchUsers} disabled={loading}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <button className="primary" id="add-user-btn" onClick={openAddDialog}>
            ＋ Thêm người dùng mới
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}
      >
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TỔNG TÀI KHOẢN HỆ THỐNG</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{total}</div>
          <div style={{ fontSize: '12px', color: '#059669' }}>Quản lý 2 chiều Admin & Khách hàng</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ĐÃ XÁC THỰC KYC (CCCD 2 MẶT)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{stats.verifiedKyc}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Email thật, SĐT & Địa chỉ hợp lệ</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>HỒ SƠ KYC CHỜ DUYỆT</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{stats.pendingKyc}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Nhấn vào badge KYC để đối chiếu</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>NHÂN SỰ VẬN HÀNH (ADMIN / STAFF)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{stats.staffAndAdmin}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Bảo mật Zero-Data Retention</div>
        </div>
      </div>

      {/* Main CRUD Panel */}
      <div className="panel">
        {error && <p className="error" role="alert">{error}</p>}
        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ flex: '1 1 280px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Tìm kiếm theo Họ tên, Email, Số điện thoại, Địa chỉ..."
              className="users-input"
              style={{ margin: 0, width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="users-role-select"
              style={{ padding: '8px 12px' }}
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
              style={{ padding: '8px 12px' }}
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
                <td style={{ fontWeight: 600, color: '#64748b' }}>
                  {(page - 1) * pageSize + idx + 1}
                </td>
                <td>
                  <div className="users-name" style={{ fontWeight: 700, color: '#0f172a' }}>
                    {u.name || 'Chưa cập nhật'}{' '}
                    {session?.user?.id === u.id && (
                      <span style={{ color: '#059669', fontSize: '11px' }}>(Bạn)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{u.email || '-'}</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>
                    {u.email_verified !== false ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>✓ Email thật đã xác thực</span>
                    ) : (
                      <span style={{ color: '#d97706' }}>⚠ Chưa xác thực email</span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '12px', lineHeight: 1.5 }}>
                  <div>📞 <b>{u.phone || 'Chưa cập nhật'}</b></div>
                  <div style={{ color: '#475569' }}>🏠 {u.address || 'Chưa cập nhật'}</div>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span
                      onClick={() => setViewKycUser(u)}
                      style={{
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background:
                          u.kyc_status === 'verified'
                            ? '#e8f5e9'
                            : u.kyc_status === 'pending'
                            ? '#fff3e0'
                            : u.kyc_status === 'rejected'
                            ? '#ffebee'
                            : '#f5f5f5',
                        color:
                          u.kyc_status === 'verified'
                            ? '#2e7d32'
                            : u.kyc_status === 'pending'
                            ? '#ef6c00'
                            : u.kyc_status === 'rejected'
                            ? '#c62828'
                            : '#666'
                      }}
                      title="Nhấn để xem và duyệt ảnh CCCD 2 mặt"
                    >
                      {u.kyc_status === 'verified'
                        ? '✓ Đã duyệt KYC'
                        : u.kyc_status === 'pending'
                        ? '🔍 Chờ duyệt KYC'
                        : u.kyc_status === 'rejected'
                        ? '✕ Từ chối KYC'
                        : 'Chưa nộp KYC'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      🪪 CCCD:{' '}
                      {u.id_card_front && u.id_card_back
                        ? 'Đủ 2 mặt'
                        : u.id_card_front || u.id_card_back
                        ? '1 mặt'
                        : 'Chưa tải'}
                    </span>
                  </div>
                </td>
                <td style={{ fontSize: '12px' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                      className="text-button users-action-button"
                      style={{ color: '#d97706' }}
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
            className="dialog-content"
            style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="users-dialog-title" style={{ margin: 0 }}>
                ✏️ Cập nhật toàn diện tài khoản: {editingUser.name || editingUser.email}
              </h3>
              <button className="slot-info-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            {editError && <p className="error" role="alert" style={{ marginBottom: '12px' }}>{editError}</p>}

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    className="users-role-select"
                    disabled={session?.user?.id === editingUser.id}
                    style={{ width: '100%' }}
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
                    className="users-role-select"
                    style={{ width: '100%' }}
                  >
                    <option value="verified">✓ Đã duyệt hợp lệ (verified)</option>
                    <option value="pending">🔍 Đang chờ duyệt (pending)</option>
                    <option value="unverified">Chưa nộp hồ sơ (unverified)</option>
                    <option value="rejected">✕ Từ chối hồ sơ (rejected)</option>
                  </select>
                </label>
              </div>

              {/* Email Verified Checkbox & Optional Password Reset */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editForm.email_verified}
                    onChange={(e) => setEditForm((f) => ({ ...f, email_verified: e.target.checked }))}
                  />
                  Đánh dấu Email thật đã xác thực (OTP/Link)
                </label>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
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

              {/* 2-Sided CCCD Management inside Edit Dialog */}
              <div style={{ marginTop: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                    🪪 Hồ sơ ảnh CCCD 2 mặt (Đối chiếu định danh chủ xe)
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: '11.5px', padding: '4px 10px', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
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
                    ⚡ Tạo nhanh ảnh CCCD 2 mặt & SĐT/Địa chỉ mẫu
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>CCCD Mặt trước</div>
                    {editForm.id_card_front ? (
                      <div style={{ marginBottom: '8px' }}>
                        <img
                          src={editForm.id_card_front}
                          alt="CCCD Mặt trước"
                          style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          className="text-button error"
                          style={{ fontSize: '11px', marginTop: '4px' }}
                          onClick={() => setEditForm((f) => ({ ...f, id_card_front: '' }))}
                        >
                          Xóa ảnh mặt trước
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', color: '#94a3b8', fontSize: '12px' }}>Chưa có ảnh</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '11px', width: '100%' }}
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (base64) =>
                          setEditForm((f) => ({ ...f, id_card_front: base64 }))
                        )
                      }
                    />
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>CCCD Mặt sau</div>
                    {editForm.id_card_back ? (
                      <div style={{ marginBottom: '8px' }}>
                        <img
                          src={editForm.id_card_back}
                          alt="CCCD Mặt sau"
                          style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          className="text-button error"
                          style={{ fontSize: '11px', marginTop: '4px' }}
                          onClick={() => setEditForm((f) => ({ ...f, id_card_back: '' }))}
                        >
                          Xóa ảnh mặt sau
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', color: '#94a3b8', fontSize: '12px' }}>Chưa có ảnh</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '11px', width: '100%' }}
                      onChange={(e) =>
                        handleImageFile(e.target.files?.[0], (base64) =>
                          setEditForm((f) => ({ ...f, id_card_back: base64 }))
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
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
            className="dialog-content"
            style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="users-dialog-title">＋ Thêm tài khoản người dùng mới</h3>
            <p className="users-dialog-desc">
              Tạo nhanh tài khoản Khách hàng, Nhân viên hoặc Quản trị viên với đầy đủ thông tin liên hệ và KYC.
            </p>
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>
                🪪 Điền nhanh dữ liệu & ảnh CCCD 2 mặt mẫu:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {SAMPLE_KYC_PROFILES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="secondary"
                    style={{ fontSize: '11px', padding: '4px 8px', background: '#fff', color: '#047857', borderColor: '#6ee7b7' }}
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
                        })
                      }))
                    }
                  >
                    ⚡ Mẫu {idx + 1}: {s.name}
                  </button>
                ))}
              </div>
            </div>
            {addError && <p className="error" role="alert" style={{ marginBottom: '12px' }}>{addError}</p>}
            <form onSubmit={handleAddUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    className={`users-role-select ${
                      addForm.role === 'admin' ? 'is-admin' : addForm.role === 'staff' ? 'is-staff' : 'is-user'
                    }`}
                    style={{ width: '100%' }}
                  >
                    <option value="user">USER – Khách hàng thông thường</option>
                    <option value="staff">STAFF – Nhân viên bãi xe</option>
                    <option value="admin">ADMIN – Quản trị viên</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>
                  Ảnh CCCD Mặt trước (Tùy chọn)
                  <input
                    type="file"
                    accept="image/*"
                    style={{ fontSize: '11px', marginTop: '4px', width: '100%' }}
                    onChange={(e) =>
                      handleImageFile(e.target.files?.[0], (base64) =>
                        setAddForm((f) => ({ ...f, id_card_front: base64 }))
                      )
                    }
                  />
                </label>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>
                  Ảnh CCCD Mặt sau (Tùy chọn)
                  <input
                    type="file"
                    accept="image/*"
                    style={{ fontSize: '11px', marginTop: '4px', width: '100%' }}
                    onChange={(e) =>
                      handleImageFile(e.target.files?.[0], (base64) =>
                        setAddForm((f) => ({ ...f, id_card_back: base64 }))
                      )
                    }
                  />
                </label>
              </div>

              <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
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
            className="dialog-content"
            style={{ maxWidth: '760px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="users-dialog-title" style={{ margin: 0 }}>
                👁️ Hồ sơ 360° Tài khoản: {detailUser.name || detailUser.email}
              </h3>
              <button className="slot-info-close" onClick={() => setDetailUser(null)}>✕</button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                Đang tải dữ liệu phương tiện, vị trí đỗ cố định và lịch sử gói thuê...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Profile Summary */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: '#f8fafc',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px'
                  }}
                >
                  <div><b>Họ và tên:</b> {detailData?.profile?.name || detailUser.name || '-'}</div>
                  <div><b>Email:</b> {detailData?.profile?.email || detailUser.email || '-'}</div>
                  <div><b>Số điện thoại:</b> {detailData?.profile?.phone || detailUser.phone || 'Chưa cập nhật'}</div>
                  <div><b>Địa chỉ:</b> {detailData?.profile?.address || detailUser.address || 'Chưa cập nhật'}</div>
                  <div><b>Phân quyền:</b> {(detailData?.profile?.role || detailUser.role || 'user').toUpperCase()}</div>
                  <div><b>Trạng thái KYC:</b> {(detailData?.profile?.kyc_status || detailUser.kyc_status || 'unverified').toUpperCase()}</div>
                </div>

                {/* Vehicles & Fixed Parking Slots (1 Slot = 1 Xe) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                      🚗 Phương tiện đã đăng ký ({detailData?.vehicles?.length || 0})
                    </div>
                    {detailData?.vehicles?.length ? (
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.6 }}>
                        {detailData.vehicles.map((v) => (
                          <li key={v.id}>
                            <b>{v.license_plate}</b> ({v.type === 'car' ? 'Ô tô' : 'Xe máy'})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa đăng ký phương tiện nào.</div>
                    )}
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                      🅿️ Ô đỗ cố định đang giữ (1 Slot = 1 Xe) ({detailData?.slots?.length || 0})
                    </div>
                    {detailData?.slots?.length ? (
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.6 }}>
                        {detailData.slots.map((s) => (
                          <li key={s.id}>
                            Ô <b>{s.id}</b> • Trạng thái: <b style={{ color: '#059669' }}>{s.status}</b>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa giữ ô đỗ cố định nào.</div>
                    )}
                  </div>
                </div>

                {/* Recent Transactions & Subscription Cycle */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                    💳 Lịch sử Thanh toán & Chu kỳ Gói thuê gần nhất
                  </div>
                  {detailData?.transactions?.length ? (
                    <table className="data-table" style={{ fontSize: '12px' }}>
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
                            <td style={{ fontWeight: 700 }}>{Number(tx.amount || 0).toLocaleString('vi-VN')}đ</td>
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
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: tx.status === 'completed' ? '#059669' : '#d97706'
                                }}
                              >
                                {tx.status === 'completed' ? '✓ Đã kích hoạt' : tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa phát sinh giao dịch thanh toán nào.</div>
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
              className="users-dialog-title"
              style={{ color: deleteMode === 'zero' ? '#d97706' : '#dc2626' }}
            >
              {deleteMode === 'zero'
                ? '🧹 Xác nhận Xóa dữ liệu nhạy cảm về Zero (Zero-Data Retention)'
                : '🗑️ Xác nhận Xóa vĩnh viễn tài khoản'}
            </h3>
            <p className="users-dialog-desc">
              Tài khoản mục tiêu: <b>{userToDelete.name || userToDelete.email}</b> ({userToDelete.email})
            </p>
            <div
              style={{
                background: deleteMode === 'zero' ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${deleteMode === 'zero' ? '#fde68a' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.85rem',
                color: deleteMode === 'zero' ? '#92400e' : '#991b1b',
                marginBottom: '16px'
              }}
            >
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

            {deleteError && <p className="error" role="alert" style={{ marginBottom: '12px' }}>{deleteError}</p>}

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
                className="primary"
                style={{
                  background: deleteMode === 'zero' ? '#d97706' : '#dc2626',
                  borderColor: deleteMode === 'zero' ? '#d97706' : '#dc2626'
                }}
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
      {/* 5. KYC QUICK INSPECTION MODAL                                */}
      {/* ============================================================ */}
      {viewKycUser && (
        <div className="slot-picker-overlay" style={{ zIndex: 1200 }}>
          <div className="slot-picker-dialog" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Kiểm tra & Duyệt Hồ sơ KYC: {viewKycUser.name}</h3>
              <button className="slot-info-close" onClick={() => setViewKycUser(null)}>✕</button>
            </div>
            <div style={{ margin: '12px 0', fontSize: '14px', lineHeight: 1.6 }}>
              <div><strong>Email:</strong> {viewKycUser.email}</div>
              <div><strong>Số điện thoại:</strong> {viewKycUser.phone || '(Chưa cung cấp)'}</div>
              <div><strong>Địa chỉ cư trú:</strong> {viewKycUser.address || '(Chưa cung cấp)'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0' }}>
              <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>CCCD Mặt trước</div>
                {viewKycUser.id_card_front ? (
                  <img
                    src={viewKycUser.id_card_front}
                    alt="CCCD trước"
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ padding: '40px', color: '#999' }}>Chưa tải lên</div>
                )}
              </div>
              <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>CCCD Mặt sau</div>
                {viewKycUser.id_card_back ? (
                  <img
                    src={viewKycUser.id_card_back}
                    alt="CCCD sau"
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ padding: '40px', color: '#999' }}>Chưa tải lên</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '16px' }}>
              <button
                className="secondary"
                onClick={() => {
                  const target = viewKycUser;
                  setViewKycUser(null);
                  openEdit(target);
                }}
              >
                ✏️ Sửa thông tin / Tải hộ ảnh CCCD
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="secondary"
                  onClick={() => handleKycStatusChange(viewKycUser.id, 'rejected')}
                  style={{ color: '#c62828' }}
                >
                  ✕ Từ chối KYC
                </button>
                <button
                  className="primary"
                  onClick={() => handleKycStatusChange(viewKycUser.id, 'verified')}
                  style={{ background: '#2e7d32' }}
                >
                  ✓ Duyệt Hợp Lệ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
