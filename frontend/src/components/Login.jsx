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
      const response = await fetch('http://localhost:5000/api/components/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      // If we are using supabase on the frontend for keeping state, we might need to set session manually
      // But if the plan is to remove supabase from frontend completely, we should save token in local storage
      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // You would then trigger a state update for Auth context or redirect
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
          <button className="text-button" onClick={onSwitchToLanding} style={{ color: '#fff', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
