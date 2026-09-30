import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
  };

  const handleRoleChange = async (userId, newRole) => {
    if(window.confirm(`Xác nhận đổi quyền cho người dùng này thành ${newRole.toUpperCase()}?`)) {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (!error) fetchUsers();
      else alert('Lỗi khi đổi quyền: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if(window.confirm('Xóa tài khoản này? (Lưu ý: Chỉ xóa profile, user vẫn có thể đăng nhập nếu không xóa trong Supabase Auth)')) {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (!error) fetchUsers();
      else alert('Lỗi khi xóa: ' + error.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const { error } = await supabase.from('profiles').update({ name: editName, email: editEmail }).eq('id', editingUser.id);
    if (!error) {
      setEditingUser(null);
      fetchUsers();
    } else {
      alert('Lỗi khi lưu: ' + error.message);
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
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
        <p style={{ color: '#666', marginBottom: '15px' }}>Danh sách tài khoản trong hệ thống. Để đổi quyền (role) cho tài khoản (thành Admin/Staff), hãy thao tác trực tiếp trên Supabase SQL Editor.</p>
        <table style={{ width: '100%', textAlign: 'left', marginTop: '1rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eaeaea', background: '#f9faf9' }}>
              <th style={{ padding: '12px' }}>Họ và Tên</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>Ngày tạo</th>
              <th style={{ padding: '12px', width: '120px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{u.name || 'Chưa cập nhật'} {session?.user?.id === u.id ? '(You)' : ''}</td>
                <td style={{ padding: '12px' }}>{u.email || '-'}</td>
                <td style={{ padding: '12px' }}>
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
                <td style={{ padding: '12px', fontSize: '12px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(u)} className="secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Sửa</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="secondary" style={{ padding: '4px 8px', fontSize: '11px', color: 'red', borderColor: 'red' }}>Xóa</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</td></tr>}
          </tbody>
        </table>
      </div>
      
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px' }}>
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
