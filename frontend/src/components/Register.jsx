import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import { SAMPLE_KYC_PROFILES, buildSampleCccdFront, buildSampleCccdBack } from '../lib/sampleKyc';

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

  // Pre-registration Email OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

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

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ Email thật trước khi bấm Gửi mã OTP.');
      return;
    }
    setError(null);
    setOtpNotice('');
    setOtpLoading(true);
    try {
      const res = await apiFetch('/api/components/Register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi mã OTP tới email này.');
      }
      setOtpSent(true);
      setEmailVerified(false);
      if (data.devOtpPreview) {
        setDevOtpHint(data.devOtpPreview);
        setOtpCode(data.devOtpPreview);
      } else {
        setDevOtpHint('');
      }
      setOtpNotice(data.message || `Đã gửi mã OTP 6 số tới ${email.trim()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError('Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }
    setError(null);
    setOtpLoading(true);
    try {
      const res = await apiFetch('/api/components/Register/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mã OTP không chính xác.');
      }
      setEmailVerified(true);
      setOtpNotice(data.message || '✓ Xác thực Email thật thành công!');
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFillSampleKyc = () => {
    const s = SAMPLE_KYC_PROFILES[0];
    const targetName = name.trim() || s.name;
    const targetAddress = address.trim() || s.address;
    setName(targetName);
    setPhone(phone.trim() || s.phone);
    setAddress(targetAddress);
    setIdFront(
      buildSampleCccdFront({
        name: targetName,
        cccdNo: s.cccdNo,
        dob: s.dob,
        sex: s.sex,
        origin: s.origin,
        address: targetAddress
      })
    );
    setIdBack(
      buildSampleCccdBack({
        name: targetName,
        cccdNo: s.cccdNo,
        feature: s.feature
      })
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!privacyAgreed) {
      setError('Vui lòng đồng ý với Điều khoản Bảo mật Dữ liệu & Zero-Data Retention.');
      return;
    }
    if (!emailVerified && !otpCode.trim()) {
      setError('Bắt buộc xác thực Email thật: Vui lòng bấm "Gửi mã OTP" và nhập mã xác thực 6 số trước khi tạo tài khoản.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/components/Register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: name,
          phone,
          address,
          id_card_front: idFront,
          id_card_back: idBack,
          otp: otpCode.trim(),
          requireOtp: true
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
    } catch (err) {
      setError(err.message);
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
          <a
            className="logo"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSwitchToLanding();
            }}
          >
            HT<span> PARKING</span>
          </a>
        </div>
        <div>
          <p className="eyebrow">BÃI ĐỖ DÀI HẠN · AN TÂM MỖI NGÀY</p>
          <h1>
            Một chỗ đỗ.
            <br />
            Trọn an tâm.
          </h1>
          <p>Xác thực chính chủ KYC, giữ cố định 1 Slot = 1 Xe và bảo vệ chống ngập 100%.</p>
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
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nguyễn Văn An"
              />
            </label>

            {/* Real Email + Mandatory Pre-Registration OTP Verification */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ marginBottom: '6px' }}>
                Email thật (Bắt buộc xác thực OTP){' '}
                {emailVerified && (
                  <span style={{ color: '#059669', fontWeight: 700, fontSize: '12px' }}>
                    ✓ Đã xác thực OTP
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailVerified(false);
                  }}
                  required
                  placeholder="tenban@gmail.com"
                  style={{ flex: 1, margin: 0 }}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  style={{
                    background: emailVerified ? '#ecfdf5' : '#059669',
                    color: emailVerified ? '#065f46' : '#ffffff',
                    border: '1px solid #059669',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {otpLoading ? 'Đang gửi...' : otpSent ? '↻ Gửi lại OTP' : '📨 Gửi mã OTP'}
                </button>
              </div>

              {otpSent && !emailVerified && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px',
                    background: '#f0fdf4',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '6px' }}>
                    {otpNotice}
                    {devOtpHint && (
                      <span style={{ display: 'block', marginTop: '2px', fontWeight: 700 }}>
                        🔑 Mã OTP của bạn: <code style={{ fontSize: '14px' }}>{devOtpHint}</code>
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Nhập 6 chữ số OTP"
                      maxLength={6}
                      style={{ flex: 1, margin: 0, padding: '8px 10px', fontWeight: 700, letterSpacing: '2px' }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading}
                      style={{
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Xác nhận OTP
                    </button>
                  </div>
                </div>
              )}

              {emailVerified && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '6px 10px',
                    background: '#ecfdf5',
                    border: '1px solid #6ee7b7',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#065f46',
                    fontWeight: 600
                  }}
                >
                  {otpNotice}
                </div>
              )}
            </div>

            <label>
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Ít nhất 8 ký tự"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label>
                Số điện thoại
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </label>
              <label>
                Địa chỉ cư trú
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quận/Huyện, TP"
                />
              </label>
            </div>

            <div
              style={{
                marginTop: '12px',
                padding: '10px',
                border: '1px dashed #ccc',
                borderRadius: '8px',
                background: '#fafafa'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 'bold' }}>
                  🪪 Xác thực CCCD 2 mặt:
                </span>
                <button
                  type="button"
                  onClick={handleFillSampleKyc}
                  style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Điền nhanh CCCD & SĐT mẫu
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span>Mặt trước:</span>
                  {idFront && (
                    <img
                      src={idFront}
                      alt="CCCD trước"
                      style={{ width: '100%', maxHeight: '70px', objectFit: 'contain', margin: '4px 0' }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setIdFront)}
                    style={{ fontSize: '11px', width: '100%' }}
                  />
                </div>
                <div>
                  <span>Mặt sau:</span>
                  {idBack && (
                    <img
                      src={idBack}
                      alt="CCCD sau"
                      style={{ width: '100%', maxHeight: '70px', objectFit: 'contain', margin: '4px 0' }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setIdBack)}
                    style={{ fontSize: '11px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ margin: '12px 0', fontSize: '12px', color: '#555' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span>
                  Tôi cam kết thông tin là chính chủ và đồng ý với{' '}
                  <strong>Chính sách Bảo mật Dữ liệu & Zero-Data Retention</strong> (Dữ liệu không sử dụng trái mục
                  đích, được xóa sạch hoàn toàn khi đóng tài khoản).
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
