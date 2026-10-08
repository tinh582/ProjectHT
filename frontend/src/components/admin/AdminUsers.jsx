import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import Pagination from '../shared/Pagination';
import { readPage } from '../../lib/pagination';

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const pageSize = 25;
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

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
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if(window.confirm(`Xác nhận đổi quyền cho người dùng này thành ${newRole.toUpperCase()}?`)) {
      const response = await apiFetch(`/api/components/admin/AdminUsers/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) fetchUsers();
      else alert('Lỗi khi đổi quyền');
    }
  };

  const handleDeleteUser = async (userId) => {
    if(window.confirm('Xóa tài khoản này? (Lưu ý: Chỉ xóa profile, user vẫn có thể đăng nhập nếu không xóa trong Supabase Auth)')) {
      const response = await apiFetch(`/api/components/admin/AdminUsers/${userId}`, { method: 'DELETE' });
      if (response.ok) fetchUsers();
      else alert('Lỗi khi xóa');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const response = await apiFetch(`/api/components/admin/AdminUsers/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail })
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

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Quản lý người dùng<span>.</span></h1>
        </div>
      </div>
      <div className="panel">
        {error && <p className="error" role="alert">{error}</p>}
        <p className="users-description">Danh sách tài khoản trong hệ thống. Để đổi quyền (role) cho tài khoản (thành Admin/Staff), hãy chọn trong danh sách thả xuống.</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và Tên</th>
              <th>Email</th>
              <th>Role</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="users-name">{u.name || 'Chưa cập nhật'} {session?.user?.id === u.id ? '(You)' : ''}</td>
                <td>{u.email || '-'}</td>
                <td>
                  <select
                    value={u.role === 'customer' ? 'user' : (u.role || 'user')}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className={`users-role-select ${u.role === 'admin' ? 'is-admin' : u.role === 'staff' ? 'is-staff' : 'is-user'}`}
>
                    <option value="user">USER</option>
                    <option value="staff">STAFF</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => openEdit(u)} className="text-button users-action-button">Sửa</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="text-button error users-action-button">Xóa</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="5" className="users-empty">Không có tài khoản.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </div>

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
    </div>
  );
}
