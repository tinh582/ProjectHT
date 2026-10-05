import React, { useState } from 'react';

export default function Register({ onSwitchToLogin, onSwitchToLanding }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/components/Register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: name })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Đăng ký thất bại');
      
      if (data.session) {
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.reload();
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
