import { apiFetch } from '../lib/api';
import React, { useState } from 'react';

export default function Login({ onSwitchToRegister, onSwitchToLanding }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/components/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
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
          <h2 id="auth-title">Đăng nhập tài khoản</h2>

          <div className="tabs">
            <button className="active">Đăng nhập</button>
            <button onClick={onSwitchToRegister}>Đăng ký</button>
          </div>

          <form id="auth-form" onSubmit={handleLogin}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ban@example.com" />
            </label>
            <label>
              Mật khẩu
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Ít nhất 8 ký tự" />
            </label>

            {error && <p className="error">{error}</p>}

            <button className="primary full" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập →'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
