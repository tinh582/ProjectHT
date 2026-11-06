import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import {
  SAMPLE_KYC_PROFILES,
  buildSampleCccdFront,
  buildSampleCccdBack,
  buildSampleGplxFront,
  buildSampleGplxBack
} from '../lib/sampleKyc';

export default function Register({ onSwitchToLogin, onSwitchToLanding, onRegisterSuccess }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // 1. Căn cước công dân (CCCD - 2 mặt)
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);

  // 2. Giấy phép lái xe (GPLX - 2 mặt)
  const [driverLicenseFront, setDriverLicenseFront] = useState(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState(null);

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

    const handleFillSampleAll = () => {
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
      setDriverLicenseFront(
        buildSampleGplxFront({
          name: targetName,
          gplxNo: s.gplxNo || '790195008868',
          dob: s.dob,
          address: targetAddress,
          licenseClass: s.licenseClass || 'B2'
        })
      );
      setDriverLicenseBack(
        buildSampleGplxBack({
          gplxNo: s.gplxNo || '790195008868'
        })
      );
    };

    const handleFillSampleCccd = () => {
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

    const handleFillSampleGplx = () => {
      const s = SAMPLE_KYC_PROFILES[0];
      const targetName = name.trim() || s.name;
      const targetAddress = address.trim() || s.address;
      setName(targetName);
      setPhone(phone.trim() || s.phone);
      setAddress(targetAddress);
      setDriverLicenseFront(
        buildSampleGplxFront({
          name: targetName,
          gplxNo: s.gplxNo || '790195008868',
          dob: s.dob,
          address: targetAddress,
          licenseClass: s.licenseClass || 'B2'
        })
      );
      setDriverLicenseBack(
        buildSampleGplxBack({
          gplxNo: s.gplxNo || '790195008868'
        })
      );
    };

    const handleFillSampleKyc = handleFillSampleAll;

    const handleRegister = async (e) => {
      e.preventDefault();
      if (!privacyAgreed) {
        setError('Vui lòng đồng ý với Điều khoản Bảo mật Dữ liệu & Zero-Data Retention.');
        return;
      }
      if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
        setError('Số điện thoại phải gồm đúng 10 chữ số (từ 0-9, ví dụ: 0901234567).');
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
            driver_license_front: driverLicenseFront,
            driver_license_back: driverLicenseBack,
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
            <div className="auth-box" style={{ maxWidth: '450px' }}>
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
                        <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px', lineHeight: 1.4 }}>
                          🛡️ <strong>Chuẩn chống Thư rác (Anti-Spam Multipart/SPF):</strong> Thư được định tuyến ưu tiên vào <em>Hộp thư đến</em>. Nếu dịch vụ mail lọc nhầm vào <em>Thư rác (Spam)</em>, vui lòng nhấn <strong>"Không phải thư rác" (Not Spam)</strong>.
                        </div>
                        {devOtpHint && (
                          <span style={{ display: 'block', marginTop: '4px', fontWeight: 700 }}>
                            🔑 Mã OTP xác thực: <code style={{ fontSize: '14px' }}>{devOtpHint}</code>
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
                    Số điện thoại (10 số)
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      minLength={10}
                      pattern="[0-9]{10}"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="0901234567 (Đúng 10 số)"
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

                {/* ============================================================== */}
                {/* DUAL KYC DOCUMENTS: CCCD (2 SIDES) & GPLX (2 SIDES)           */}
                {/* ============================================================== */}
                <div
                  style={{
                marginTop: '14px',
                    padding: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    background: '#f8fafc'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}
                  >
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          🪪 Hồ sơ Định danh Kép (CCCD & GPLX)
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Yêu cầu cả Căn cước công dân và Giấy phép lái xe (4 mặt ảnh)
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleFillSampleAll}
                          style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            borderRadius: '5px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Điền tự động cả 4 mặt ảnh CCCD & GPLX"
                        >
                          ✨ Cả CCCD & GPLX (4 mặt)
                        </button>
                        <button
                          type="button"
                          onClick={handleFillSampleCccd}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '5px',
                            padding: '3px 7px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🪪 CCCD
                        </button>
                        <button
                          type="button"
                          onClick={handleFillSampleGplx}
                          style={{
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '5px',
                            padding: '3px 7px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🚗 GPLX
                        </button>
                      </div>
                  </div>

                  {/* Status bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      fontSize: '11.5px'
                    }}
                  >
                    <span>
                      <strong>CCCD:</strong>{' '}
                      {idFront && idBack ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>✓ Đủ 2 mặt</span>
                      ) : idFront || idBack ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>1 mặt</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chưa tải</span>
                      )}
                    </span>
                    <span>
                      <strong>GPLX:</strong>{' '}
                      {driverLicenseFront && driverLicenseBack ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>✓ Đủ 2 mặt</span>
                      ) : driverLicenseFront || driverLicenseBack ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>1 mặt</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chưa tải</span>
                      )}
                    </span>
                  </div>

              {/* DOCUMENT SECTION 1: CCCD */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  🪪 1. Căn cước công dân (CCCD - 2 mặt):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                  <div style={{ border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '6px', textAlign: 'center', background: '#fff' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#475569' }}>Mặt trước CCCD</div>
                    {idFront ? (
                      <div>
                        <img
                          src={idFront}
                          alt="CCCD trước"
                          style={{ width: '100%', maxHeight: '75px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setIdFront(null)}
                          style={{ marginTop: '4px', color: '#dc2626', background: 'none', border: 'none', fontSize: '10.5px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✕ Xóa ảnh
                        </button>
                      </div>
                    ) : (
                      <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>
                        Chưa có ảnh
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setIdFront)}
                      style={{ fontSize: '10.5px', width: '100%', marginTop: '4px' }}
                    />
                  </div>
                  <div style={{ border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '6px', textAlign: 'center', background: '#fff' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#475569' }}>Mặt sau CCCD</div>
                    {idBack ? (
                      <div>
                        <img
                          src={idBack}
                          alt="CCCD sau"
                          style={{ width: '100%', maxHeight: '75px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setIdBack(null)}
                          style={{ marginTop: '4px', color: '#dc2626', background: 'none', border: 'none', fontSize: '10.5px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✕ Xóa ảnh
                        </button>
                      </div>
                    ) : (
                      <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>
                        Chưa có ảnh
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setIdBack)}
                      style={{ fontSize: '10.5px', width: '100%', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* DOCUMENT SECTION 2: GPLX */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  🚗 2. Giấy phép lái xe (GPLX - 2 mặt):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                  <div style={{ border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '6px', textAlign: 'center', background: '#fff' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#475569' }}>Mặt trước (Thẻ PET)</div>
                    {driverLicenseFront ? (
                      <div>
                        <img
                          src={driverLicenseFront}
                          alt="GPLX trước"
                          style={{ width: '100%', maxHeight: '75px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setDriverLicenseFront(null)}
                          style={{ marginTop: '4px', color: '#dc2626', background: 'none', border: 'none', fontSize: '10.5px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✕ Xóa ảnh
                        </button>
                      </div>
                    ) : (
                      <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>
                        Chưa có ảnh
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setDriverLicenseFront)}
                      style={{ fontSize: '10.5px', width: '100%', marginTop: '4px' }}
                    />
                  </div>
                  <div style={{ border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '6px', textAlign: 'center', background: '#fff' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#475569' }}>Mặt sau (Hạng bằng)</div>
                    {driverLicenseBack ? (
                      <div>
                        <img
                          src={driverLicenseBack}
                          alt="GPLX sau"
                          style={{ width: '100%', maxHeight: '75px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setDriverLicenseBack(null)}
                          style={{ marginTop: '4px', color: '#dc2626', background: 'none', border: 'none', fontSize: '10.5px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✕ Xóa ảnh
                        </button>
                      </div>
                    ) : (
                      <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>
                        Chưa có ảnh
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setDriverLicenseBack)}
                      style={{ fontSize: '10.5px', width: '100%', marginTop: '4px' }}
                    />
                  </div>
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
