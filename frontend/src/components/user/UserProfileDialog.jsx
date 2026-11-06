import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import {
  SAMPLE_KYC_PROFILES,
  buildSampleCccdFront,
  buildSampleCccdBack,
  buildSampleGplxFront,
  buildSampleGplxBack
} from '../../lib/sampleKyc';

export default function UserProfileDialog({ session, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // 1. Căn cước công dân (CCCD - 2 mặt)
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);

  // 2. Giấy phép lái xe (GPLX - 2 mặt)
  const [driverLicenseFront, setDriverLicenseFront] = useState(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState(null);

  // Email OTP Verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setIdFront(data.id_card_front || null);
        setIdBack(data.id_card_back || null);
        setDriverLicenseFront(data.driver_license_front || null);
        setDriverLicenseBack(data.driver_license_back || null);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setOtpLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile?.email || session?.user?.email })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Không thể gửi mã OTP.' });
        return;
      }
      setOtpSent(true);
      if (data.devOtpPreview) {
        setDevOtpHint(data.devOtpPreview);
        setOtpCode(data.devOtpPreview);
      }
      setMessage({
        type: 'success',
        text: `${data.message}${data.devOtpPreview ? ` (Mã OTP của bạn: ${data.devOtpPreview})` : ''}`
      });
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi gửi mã OTP.' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpCode.trim()) return;
    setOtpLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Mã OTP không hợp lệ.' });
        return;
      }
      setOtpSent(false);
      setOtpCode('');
      setDevOtpHint('');
      setMessage({ type: 'success', text: '✓ Xác thực Email thật bằng mã OTP thành công!' });
      fetchProfile();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xác thực OTP.' });
    } finally {
      setOtpLoading(false);
    }
  };

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

  const applySampleCccd = (sampleIdx = 0) => {
    const s = SAMPLE_KYC_PROFILES[sampleIdx] || SAMPLE_KYC_PROFILES[0];
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
    setMessage({
      type: 'success',
      text: `✓ Đã tạo tự động ảnh CCCD 2 mặt cho "${targetName}".`
    });
  };

  const applySampleGplx = (sampleIdx = 0) => {
    const s = SAMPLE_KYC_PROFILES[sampleIdx] || SAMPLE_KYC_PROFILES[0];
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
    setMessage({
      type: 'success',
      text: `✓ Đã tạo tự động ảnh Giấy phép lái xe (GPLX) 2 mặt cho "${targetName}".`
    });
  };

  const applySampleAll = (sampleIdx = 0) => {
    const s = SAMPLE_KYC_PROFILES[sampleIdx] || SAMPLE_KYC_PROFILES[0];
    const targetName = name.trim() || s.name;
    const targetAddress = address.trim() || s.address;
    setName(targetName);
    setPhone(phone.trim() || s.phone);
    setAddress(targetAddress);

    // 1. Generate CCCD Front & Back
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

    // 2. Generate GPLX Front & Back
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

    setMessage({
      type: 'success',
      text: `✓ Đã điền đầy đủ CẢ CĂN CƯỚC CÔNG DÂN (CCCD) VÀ GIẤY PHÉP LÁI XE (GPLX) (Đủ 4 ảnh 2 mặt) cho "${targetName}". Nhấn "Lưu hồ sơ KYC" để hoàn tất!`
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      setMessage({ type: 'error', text: 'Số điện thoại phải gồm đúng 10 chữ số (từ 0-9, ví dụ: 0901234567).' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address,
          id_card_front: idFront,
          id_card_back: idBack,
          driver_license_front: driverLicenseFront,
          driver_license_back: driverLicenseBack
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '✓ Cập nhật hồ sơ định danh (CCCD & GPLX) thành công!' });
        fetchProfile();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Lỗi khi cập nhật.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSaving(false);
    }
  };

  const handleZeroDataPurge = async () => {
    if (
      !window.confirm(
        'BẢO MẬT ZERO-DATA: Bạn có chắc chắn muốn xóa toàn bộ thông tin nhạy cảm (SĐT, Địa chỉ, ảnh CCCD 2 mặt và ảnh GPLX 2 mặt) khỏi hệ thống? Dữ liệu này sẽ không thể khôi phục.'
      )
    ) {
      return;
    }
    setPurging(true);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}/purge-data`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('Đã xóa sạch toàn bộ dữ liệu cá nhân nhạy cảm (CCCD & GPLX) theo tiêu chuẩn Zero-Data Retention!');
        fetchProfile();
      }
    } catch {
      alert('Lỗi khi thực hiện xóa dữ liệu');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="slot-picker-overlay" style={{ zIndex: 1200 }}>
      <div
        className="slot-picker-dialog"
        style={{ maxWidth: '820px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="slot-picker-title">🪪 Hồ sơ Cá nhân, Căn cước công dân (CCCD) & Giấy phép lái xe (GPLX)</h2>
            <p className="slot-picker-description">
              Hệ thống yêu cầu xác thực <strong>CẢ Căn cước công dân (CCCD) VÀ Giấy phép lái xe (GPLX)</strong> để đảm bảo an ninh vận hành và đối chiếu chính xác chủ xe.
            </p>
          </div>
          <button className="slot-info-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 1-Click Sample All Helper Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '14px'
          }}
        >
          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700, marginBottom: '8px' }}>
            ⚡ Điền thông tin & ảnh mẫu thử nghiệm (Hỗ trợ cả CCCD & GPLX):
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applySampleAll(0)}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✨ Điền đầy đủ cả CCCD & GPLX (4 mặt ảnh)
            </button>
            <button
              type="button"
              onClick={() => applySampleCccd(0)}
              style={{
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🪪 Chỉ tạo mẫu CCCD (2 mặt)
            </button>
            <button
              type="button"
              onClick={() => applySampleGplx(0)}
              style={{
                background: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🚗 Chỉ tạo mẫu GPLX (2 mặt)
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '12px',
              background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#c62828',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>Đang tải thông tin...</div>
        ) : (
          <form onSubmit={handleSave}>
            {/* User basic info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label>
                Họ và tên
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <div>
                <label style={{ marginBottom: '4px' }}>
                  Email thật{' '}
                  {profile?.email_verified ? (
                    <span style={{ color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>
                      (✓ Đã xác thực OTP)
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontSize: '11.5px', fontWeight: 700 }}>
                      (⚠ Chưa xác thực OTP)
                    </span>
                  )}
                  <input
                    type="email"
                    value={profile?.email || session?.user?.email}
                    disabled
                    style={{ background: '#f5f5f5' }}
                  />
                </label>

                {!profile?.email_verified && (
                  <div style={{ marginTop: '6px' }}>
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={otpLoading}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #93c5fd',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {otpLoading ? 'Đang gửi mã...' : '📨 Gửi mã OTP 6 số xác thực Email'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Nhập 6 số OTP"
                          maxLength={6}
                          style={{ width: '120px', padding: '5px 8px', fontSize: '12px', margin: 0 }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          disabled={otpLoading}
                          style={{
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Xác nhận OTP
                        </button>
                        {devOtpHint && (
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                            Mã: {devOtpHint}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label>
                Số điện thoại liên hệ (10 chữ số)
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
                  placeholder="Số nhà, Tên đường, Quận/Huyện"
                />
              </label>
            </div>

            {/* Status bar */}
            <div
              style={{
                margin: '12px 0 16px 0',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <strong>Trạng thái KYC & Hồ sơ: </strong>
                <span
                  style={{
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    marginLeft: '6px',
                    background:
                      profile?.kyc_status === 'verified'
                        ? '#ecfdf5'
                        : profile?.kyc_status === 'pending'
                        ? '#fffbeb'
                        : '#f1f5f9',
                    color:
                      profile?.kyc_status === 'verified'
                        ? '#065f46'
                        : profile?.kyc_status === 'pending'
                        ? '#b45309'
                        : '#475569'
                  }}
                >
                  {profile?.kyc_status === 'verified'
                    ? '✓ Đã duyệt hợp lệ (CCCD + GPLX)'
                    : profile?.kyc_status === 'pending'
                    ? '⏳ Đang chờ nhân viên đối chiếu'
                    : 'Chưa hoàn tất KYC'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                <span style={{ color: idFront && idBack ? '#059669' : '#dc2626', fontWeight: 700 }}>
                  🪪 CCCD: {idFront && idBack ? '✓ Đủ 2 mặt' : idFront || idBack ? '⚠ Thiếu 1 mặt' : '✕ Chưa tải'}
                </span>
                <span style={{ color: driverLicenseFront && driverLicenseBack ? '#059669' : '#dc2626', fontWeight: 700 }}>
                  🚗 GPLX: {driverLicenseFront && driverLicenseBack ? '✓ Đủ 2 mặt' : driverLicenseFront || driverLicenseBack ? '⚠ Thiếu 1 mặt' : '✕ Chưa tải'}
                </span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* DOCUMENT SECTION 1: CĂN CƯỚC CÔNG DÂN (CCCD)                  */}
            {/* ============================================================== */}
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                background: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  🪪 PHẦN 1: CĂN CƯỚC CÔNG DÂN (CCCD) — 2 MẶT
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Định danh chủ phương tiện hợp pháp
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                    Ảnh CCCD Mặt trước
                  </div>
                  {idFront ? (
                    <div>
                      <img
                        src={idFront}
                        alt="CCCD trước"
                        style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setIdFront(null)}
                        style={{ marginTop: '6px', color: '#dc2626', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Xóa ảnh này
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '90px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '12px'
                      }}
                    >
                      Chưa có ảnh CCCD mặt trước
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setIdFront)}
                    style={{ marginTop: '6px', fontSize: '11.5px', width: '100%' }}
                  />
                </div>

                <div style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                    Ảnh CCCD Mặt sau
                  </div>
                  {idBack ? (
                    <div>
                      <img
                        src={idBack}
                        alt="CCCD sau"
                        style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setIdBack(null)}
                        style={{ marginTop: '6px', color: '#dc2626', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Xóa ảnh này
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '90px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '12px'
                      }}
                    >
                      Chưa có ảnh CCCD mặt sau
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setIdBack)}
                    style={{ marginTop: '6px', fontSize: '11.5px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* DOCUMENT SECTION 2: GIẤY PHÉP LÁI XE (GPLX)                   */}
            {/* ============================================================== */}
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                background: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  🚗 PHẦN 2: GIẤY PHÉP LÁI XE (GPLX) — 2 MẶT
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Đối chiếu thủ công hạng bằng lái & biển số xe
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                    Ảnh GPLX Mặt trước (Thẻ PET)
                  </div>
                  {driverLicenseFront ? (
                    <div>
                      <img
                        src={driverLicenseFront}
                        alt="GPLX trước"
                        style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setDriverLicenseFront(null)}
                        style={{ marginTop: '6px', color: '#dc2626', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Xóa ảnh này
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '90px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '12px'
                      }}
                    >
                      Chưa có ảnh GPLX mặt trước
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setDriverLicenseFront)}
                    style={{ marginTop: '6px', fontSize: '11.5px', width: '100%' }}
                  />
                </div>

                <div style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                    Ảnh GPLX Mặt sau (Hạng bằng lái)
                  </div>
                  {driverLicenseBack ? (
                    <div>
                      <img
                        src={driverLicenseBack}
                        alt="GPLX sau"
                        style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setDriverLicenseBack(null)}
                        style={{ marginTop: '6px', color: '#dc2626', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Xóa ảnh này
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '90px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '12px'
                      }}
                    >
                      Chưa có ảnh GPLX mặt sau
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setDriverLicenseBack)}
                    style={{ marginTop: '6px', fontSize: '11.5px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                background: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                fontSize: '12px',
                color: '#166534',
                marginBottom: '16px'
              }}
            >
              <strong>🔒 Cam kết Bảo mật Dữ liệu & Quyền riêng tư (Zero-Data Retention):</strong>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>
                Thông tin CCCD, GPLX và liên lạc chỉ dùng duy nhất cho mục đích bảo vệ tài sản xe của bạn tại bãi đỗ. Hệ
                thống tuân thủ chính sách <em>Zero-Data Retention</em>, cho phép bạn tự xóa sạch dữ liệu vĩnh viễn bất
                kỳ lúc nào.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={handleZeroDataPurge}
                disabled={purging}
                style={{
                  color: '#c62828',
                  background: 'none',
                  border: '1px solid #c62828',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {purging ? 'Đang xóa...' : '🗑️ Xóa sạch thông tin nhạy cảm (Zero-Data)'}
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="secondary" onClick={onClose}>
                  Đóng
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : '✓ Lưu hồ sơ KYC (CCCD & GPLX)'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
