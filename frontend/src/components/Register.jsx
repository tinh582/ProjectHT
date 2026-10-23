import { apiFetch } from '../lib/api';
import React, { useState } from 'react';

export default function Register({ onSwitchToLogin, onSwitchToLanding, onRegisterSuccess }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(true);
  const [error, setError] = useState(null);

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh nhỏ hơn 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!privacyAgreed) {
      setError('Vui lòng đồng ý với Điều khoản Bảo mật Dữ liệu & Zero-Data Retention.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/components/Register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: name,
          phone,
          address,
          id_card_front: idFront,
          id_card_back: idBack,
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Đăng ký thất bại');

      if (data.session) {
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (onRegisterSuccess) {
          onRegisterSuccess(data);
        } else {
          window.location.reload();
        }
      } else {
        alert('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận hoặc đăng nhập.');
        onSwitchToLogin();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth" className="auth-layout">
      <section className="intro">
        <div>
          <button className="text-button auth-back-button" onClick={onSwitchToLanding}>
            ← Quay lại trang chủ
          </button>
          <a className="logo" href="/" onClick={(e) => { e.preventDefault(); onSwitchToLanding(); }}>HT<span> PARKING</span></a>
        </div>
        <div>
          <p className="eyebrow">BÃI ĐỖ DÀI HẠN · AN TÂM MỖI NGÀY</p>
          <h1>Một chỗ đỗ.<br/>Trọn an tâm.</h1>
          <p>Quản lý phương tiện của bạn tại bãi đỗ HT.</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <h2 id="auth-title">Tạo tài khoản của bạn</h2>

          <div className="tabs">
            <button onClick={onSwitchToLogin}>Đăng nhập</button>
            <button className="active">Đăng ký</button>
          </div>

          <form id="auth-form" onSubmit={handleRegister}>
            <label>
              Họ và tên
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nguyễn Văn An" />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ban@example.com" />
            </label>
            <label>
              Mật khẩu
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Ít nhất 8 ký tự" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label>
                Số điện thoại
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" />
              </label>
              <label>
                Địa chỉ cư trú
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quận/Huyện, TP" />
              </label>
            </div>

            <div style={{ marginTop: '12px', padding: '10px', border: '1px dashed #ccc', borderRadius: '8px', background: '#fafafa' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Xác thực CCCD (Tùy chọn khi đăng ký / Cập nhật sau):</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span>Mặt trước:</span>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setIdFront)} style={{ fontSize: '11px' }} />
                </div>
                <div>
                  <span>Mặt sau:</span>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setIdBack)} style={{ fontSize: '11px' }} />
                </div>
              </div>
            </div>

            <div style={{ margin: '12px 0', fontSize: '12px', color: '#555' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={e => setPrivacyAgreed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span>
                  Tôi cam kết thông tin là chính chủ và đồng ý với <strong>Chính sách Bảo mật Dữ liệu & Zero-Data Retention</strong> (Dữ liệu không sử dụng trái mục đích, được xóa sạch hoàn toàn khi đóng tài khoản).
                </span>
              </label>
            </div>

            {error && <p className="error">{error}</p>}

            <button className="primary full" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Tạo tài khoản →'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
