import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function UserProfileDialog({ session, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);

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
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
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

  const handleSave = async (e) => {
    e.preventDefault();
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
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cập nhật hồ sơ & giấy tờ KYC thành công!' });
        fetchProfile();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Lỗi khi cập nhật.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSaving(false);
    }
  };

  const handleZeroDataPurge = async () => {
    if (!window.confirm('BẢO MẬT ZERO-DATA: Bạn có chắc chắn muốn xóa toàn bộ thông tin nhạy cảm (SĐT, Địa chỉ, CCCD) khỏi máy chủ? Dữ liệu này sẽ không thể khôi phục.')) {
      return;
    }
    setPurging(true);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}/purge-data`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Đã xóa sạch toàn bộ dữ liệu cá nhân nhạy cảm theo tiêu chuẩn Zero-Data Retention!');
        fetchProfile();
      }
    } catch (e) {
      alert('Lỗi khi thực hiện xóa dữ liệu');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="slot-picker-overlay" style={{ zIndex: 1200 }}>
      <div className="slot-picker-dialog" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="slot-picker-title">Xác thực Danh tính (KYC) & Hồ sơ Cá nhân</h2>
            <p className="slot-picker-description">Bảo vệ tài khoản và nâng cao an toàn tài sản phương tiện.</p>
          </div>
          <button className="slot-info-close" onClick={onClose}>✕</button>
        </div>

        {message && (
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '12px',
            background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: message.type === 'success' ? '#2e7d32' : '#c62828'
          }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>Đang tải thông tin...</div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label>
                Họ và tên
                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
              </label>
              <label>
                Email
                <input type="email" value={profile?.email || session?.user?.email} disabled style={{ background: '#f5f5f5' }} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label>
                Số điện thoại liên hệ
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" />
              </label>
              <label>
                Địa chỉ cư trú
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Số nhà, Tên đường, Quận/Huyện" />
              </label>
            </div>

            <div style={{ margin: '12px 0', padding: '10px', borderRadius: '6px', background: '#fafafa', border: '1px solid #eee' }}>
              <strong>Trạng thái KYC: </strong>
              <span style={{
                fontWeight: 'bold',
                padding: '4px 8px',
                borderRadius: '4px',
                marginLeft: '8px',
                background: profile?.kyc_status === 'verified' ? '#e8f5e9' : profile?.kyc_status === 'pending' ? '#fff3e0' : '#f5f5f5',
                color: profile?.kyc_status === 'verified' ? '#2e7d32' : profile?.kyc_status === 'pending' ? '#ef6c00' : '#666'
              }}>
                {profile?.kyc_status === 'verified' ? '✓ Đã xác thực CCCD' : profile?.kyc_status === 'pending' ? '⏳ Đang chờ đối chiếu' : 'Chưa nộp CCCD'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ border: '1px dashed #ccc', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Ảnh CCCD mặt trước</div>
                {idFront ? (
                  <img src={idFront} alt="CCCD trước" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Chưa có ảnh</div>
                )}
                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setIdFront)} style={{ marginTop: '8px', fontSize: '12px' }} />
              </div>

              <div style={{ border: '1px dashed #ccc', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Ảnh CCCD mặt sau</div>
                {idBack ? (
                  <img src={idBack} alt="CCCD sau" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Chưa có ảnh</div>
                )}
                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setIdBack)} style={{ marginTop: '8px', fontSize: '12px' }} />
              </div>
            </div>

            <div style={{ padding: '10px', background: '#f0f7ff', borderRadius: '8px', fontSize: '12px', color: '#004085', marginBottom: '16px' }}>
              <strong>🔒 Cam kết Bảo mật Dữ liệu & Quyền riêng tư:</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                Thông tin CCCD và liên lạc chỉ dùng duy nhất cho mục đích bảo vệ tài sản xe của bạn tại bãi đỗ. Hệ thống tuân thủ chính sách <em>Zero-Data Retention</em>, cho phép bạn tự xóa sạch dữ liệu vĩnh viễn bất kỳ lúc nào.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button type="button" onClick={handleZeroDataPurge} disabled={purging} style={{ color: '#c62828', background: 'none', border: '1px solid #c62828', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', cursor: 'pointer' }}>
                {purging ? 'Đang xóa...' : '🗑️ Xóa sạch thông tin nhạy cảm (Zero-Data)'}
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="secondary" onClick={onClose}>Đóng</button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu hồ sơ KYC'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
