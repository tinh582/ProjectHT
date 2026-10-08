import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import Pagination from '../shared/Pagination';

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    const response = await apiFetch(`/api/components/admin/AdminUsers?page=${page}&pageSize=${pageSize}`);
    if (!response.ok) return;
    const data = await response.json();
    setUsers(data.items);
    setTotal(data.total);
    if (page > 1 && data.items.length === 0) setPage(page - 1);
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
        <p style={{ color: '#666', marginBottom: '15px' }}>Danh sách tài khoản trong hệ thống. Để đổi quyền (role) cho tài khoản (thành Admin/Staff), hãy chọn trong danh sách thả xuống.</p>
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
                <td style={{ fontWeight: '500' }}>{u.name || 'Chưa cập nhật'} {session?.user?.id === u.id ? '(You)' : ''}</td>
                <td>{u.email || '-'}</td>
                <td>
                  <select 
                    value={u.role || 'user'} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ 
                      background: u.role === 'admin' ? '#ffebee' : u.role === 'staff' ? '#e3f2fd' : '#e8f5e9',
                      color: u.role === 'admin' ? '#c62828' : u.role === 'staff' ? '#1565c0' : '#2e7d32',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', outline: 'none'
                    }}
                  >
                    <option value="user">USER</option>
                    <option value="staff">STAFF</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => openEdit(u)} className="text-button" style={{ padding: '4px 8px', fontSize: '11px' }}>Sửa</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="text-button error" style={{ padding: '4px 8px', fontSize: '11px' }}>Xóa</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Không có tài khoản.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </div>
      
      {editingUser && (
        <div className="dialog-overlay">
          <div className="dialog-content sm">
            <h3 style={{ marginTop: 0 }}>Sửa thông tin</h3>
            <form onSubmit={handleSaveEdit}>
              <label style={{ display: 'block', marginBottom: '15px' }}>
                Họ và tên
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', marginTop: '5px' }} />
              </label>
              <label style={{ display: 'block', marginBottom: '20px' }}>
                Email
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: '100%', marginTop: '5px' }} />
              </label>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
