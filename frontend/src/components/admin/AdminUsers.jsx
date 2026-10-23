import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import Pagination from '../shared/Pagination';
import { readPage } from '../../lib/pagination';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'user' };

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const pageSize = 25;

  // Edit existing user
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Add new user
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // KYC Inspection Modal
  const [viewKycUser, setViewKycUser] = useState(null);

  // Delete user modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    setError('');
    try {
      const response = await apiFetch(`/api/components/admin/AdminUsers?page=${page}&pageSize=${pageSize}`);
      if (!response.ok) return;
      const data = readPage(await response.json(), page, pageSize);
      setUsers(data.items);
      setTotal(data.total);
      if (page > 1 && data.items.length === 0) setPage(page - 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (window.confirm(`Xác nhận đổi quyền cho người dùng này thành ${newRole.toUpperCase()}?`)) {
      const response = await apiFetch(`/api/components/admin/AdminUsers/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) fetchUsers();
      else alert('Lỗi khi đổi quyền');
    }
  };

  const handleKycStatusChange = async (userId, kyc_status) => {
    const response = await apiFetch(`/api/components/admin/AdminUsers/${userId}/kyc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kyc_status }),
    });
    if (response.ok) {
      setViewKycUser(null);
      fetchUsers();
    } else {
      alert('Lỗi khi cập nhật trạng thái KYC');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const response = await apiFetch(`/api/components/admin/AdminUsers/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || 'Lỗi khi xóa tài khoản.');
        return;
      }
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setDeleteError(err.message || 'Lỗi kết nối khi xóa tài khoản.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const response = await apiFetch(`/api/components/admin/AdminUsers/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail }),
    });
    if (response.ok) {
      setEditingUser(null);
      fetchUsers();
    } else {
      alert('Lỗi khi lưu');
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
  };

  const openAddDialog = () => {
    setAddForm(EMPTY_FORM);
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
        body: JSON.stringify(addForm),
      });
      const data = await response.json();
      if (!response.ok) {
        setAddError(data.error || 'Lỗi khi tạo tài khoản.');
        return;
      }
      setShowAddDialog(false);
      setAddForm(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Quản lý người dùng<span>.</span></h1>
        </div>
        <button className="primary" id="add-user-btn" onClick={openAddDialog}>＋ Thêm người dùng</button>
      </div>
      <div className="panel">
        {error && <p className="error" role="alert">{error}</p>}
        <p className="users-description">Danh sách tài khoản trong hệ thống. Để đổi quyền (role) cho tài khoản (thành Admin/Staff), hãy chọn trong danh sách thả xuống.</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và Tên</th>
              <th>Email</th>
              <th>SĐT & Địa chỉ</th>
              <th>Role</th>
              <th>Trạng thái KYC</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="users-name">{u.name || 'Chưa cập nhật'} {session?.user?.id === u.id ? '(You)' : ''}</td>
                <td>{u.email || '-'}</td>
                <td style={{ fontSize: '12px' }}>
                  <div>📞 {u.phone || 'Chưa có'}</div>
                  <div>🏠 {u.address || 'Chưa có'}</div>
                </td>
                <td>
                  <select
                    value={u.role === 'customer' ? 'user' : (u.role || 'user')}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className={`users-role-select ${u.role === 'admin' ? 'is-admin' : u.role === 'staff' ? 'is-staff' : 'is-user'}`}
                    disabled={session?.user?.id === u.id}
                  >
                    <option value="user">USER</option>
                    <option value="staff">STAFF</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </td>
                <td>
                  <span
                    onClick={() => setViewKycUser(u)}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: u.kyc_status === 'verified' ? '#e8f5e9' : u.kyc_status === 'pending' ? '#fff3e0' : '#f5f5f5',
                      color: u.kyc_status === 'verified' ? '#2e7d32' : u.kyc_status === 'pending' ? '#ef6c00' : '#666'
                    }}
                  >
                    {u.kyc_status === 'verified' ? '✓ Đã duyệt' : u.kyc_status === 'pending' ? '🔍 Cần duyệt' : 'Chưa nộp'}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button onClick={() => openEdit(u)} className="text-button users-action-button">Sửa</button>
                  <button
                    onClick={() => { setUserToDelete(u); setDeleteError(''); }}
                    className="text-button error users-action-button"
                    disabled={session?.user?.id === u.id}
                    id={`delete-user-${u.id}`}
                    title={session?.user?.id === u.id ? 'Không thể tự xóa tài khoản của chính mình' : 'Xóa tài khoản'}
                  >
                    Xóa (Zero-Data)
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="7" className="users-empty">Không có tài khoản.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </div>

      {/* Edit existing user dialog */}
      {editingUser && (
        <div className="dialog-overlay">
          <div className="dialog-content sm">
            <h3 className="users-dialog-title">Sửa thông tin</h3>
            <form onSubmit={handleSaveEdit}>
              <label className="users-name-field">
                Họ và tên
                <input value={editName} onChange={e => setEditName(e.target.value)} className="users-input" />
              </label>
              <label className="users-email-field">
                Email
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="users-input" />
              </label>
              <div className="users-dialog-actions">
                <button type="button" className="secondary" onClick={() => setEditingUser(null)}>Hủy</button>
                <button type="submit" className="primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add new user dialog */}
      {showAddDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content sm">
            <h3 className="users-dialog-title">Thêm người dùng mới</h3>
            <p className="users-dialog-desc">Tài khoản sẽ được kích hoạt ngay (không cần xác nhận email).</p>
            {addError && <p className="error" role="alert" style={{ marginBottom: '12px' }}>{addError}</p>}
            <form onSubmit={handleAddUser}>
              <label className="users-name-field">
                Họ và tên <span className="users-required">*</span>
                <input
                  id="new-user-name"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="users-input"
                  placeholder="Nguyễn Văn A"
                  required
                  autoFocus
                />
              </label>
              <label className="users-email-field">
                Email <span className="users-required">*</span>
                <input
                  id="new-user-email"
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="users-input"
                  placeholder="example@email.com"
                  required
                />
              </label>
              <label className="users-password-field">
                Mật khẩu <span className="users-required">*</span>
                <div className="users-password-wrap">
                  <input
                    id="new-user-password"
                    type={showPassword ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    className="users-input"
                    placeholder="Tối thiểu 8 ký tự"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="users-pw-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </label>
              <label className="users-role-field">
                Quyền truy cập
                <select
                  id="new-user-role"
                  value={addForm.role}
                  onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  className={`users-role-select ${addForm.role === 'admin' ? 'is-admin' : addForm.role === 'staff' ? 'is-staff' : 'is-user'}`}
                >
                  <option value="user">USER – Khách hàng thông thường</option>
                  <option value="staff">STAFF – Nhân viên bãi xe</option>
                  <option value="admin">ADMIN – Quản trị viên</option>
                </select>
              </label>
              <div className="users-dialog-actions">
                <button type="button" className="secondary" onClick={() => setShowAddDialog(false)} disabled={addLoading}>Hủy</button>
                <button type="submit" className="primary" id="add-user-submit" disabled={addLoading}>
                  {addLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {userToDelete && (
        <div className="dialog-overlay" onClick={() => !deleteLoading && setUserToDelete(null)}>
          <div className="dialog-content sm" onClick={e => e.stopPropagation()}>
            <h3 className="users-dialog-title" style={{ color: '#dc2626' }}>Xác nhận xóa tài khoản</h3>
            <p className="users-dialog-desc">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của <b>{userToDelete.name || userToDelete.email}</b> ({userToDelete.email})?
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', color: '#991b1b', marginBottom: '16px' }}>
              ⚠️ Thao tác này sẽ xóa hoàn toàn tài khoản khỏi hệ thống và giải phóng mọi phương tiện, ô đỗ liên quan. Không thể hoàn tác.
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
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={confirmDeleteUser}
                disabled={deleteLoading}
                id="confirm-delete-user-btn"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Inspection Modal */}
      {viewKycUser && (
        <div className="slot-picker-overlay" style={{ zIndex: 1200 }}>
          <div className="slot-picker-dialog" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Kiểm tra & Duyệt Hồ sơ KYC: {viewKycUser.name}</h3>
              <button className="slot-info-close" onClick={() => setViewKycUser(null)}>✕</button>
            </div>
            <div style={{ margin: '12px 0', fontSize: '14px' }}>
              <div><strong>Email:</strong> {viewKycUser.email}</div>
              <div><strong>Số điện thoại:</strong> {viewKycUser.phone || '(Chưa cung cấp)'}</div>
              <div><strong>Địa chỉ:</strong> {viewKycUser.address || '(Chưa cung cấp)'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0' }}>
              <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>CCCD Mặt trước</div>
                {viewKycUser.id_card_front ? (
                  <img src={viewKycUser.id_card_front} alt="CCCD trước" style={{ width: '100%', maxHeight: '160px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ padding: '40px', color: '#999' }}>Chưa tải lên</div>
                )}
              </div>
              <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>CCCD Mặt sau</div>
                {viewKycUser.id_card_back ? (
                  <img src={viewKycUser.id_card_back} alt="CCCD sau" style={{ width: '100%', maxHeight: '160px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ padding: '40px', color: '#999' }}>Chưa tải lên</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="secondary" onClick={() => handleKycStatusChange(viewKycUser.id, 'rejected')} style={{ color: '#c62828' }}>Từ chối KYC</button>
              <button className="primary" onClick={() => handleKycStatusChange(viewKycUser.id, 'verified')} style={{ background: '#2e7d32' }}>✓ Duyệt Hợp Lệ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
