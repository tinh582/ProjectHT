import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onSwitchToRegister }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth" className="auth-layout">
      <section className="intro">
        <a className="logo" href="/">HT<span> PARKING</span></a>
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
