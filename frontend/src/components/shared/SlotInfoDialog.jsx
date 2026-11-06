import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function SlotInfoDialog({ slot, onClose }) {
  const [vehicle, setVehicle] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slot && slot.vehicle_id) {
      fetchDetails();
    } else {
      setLoading(false);
    }
  }, [slot]);

  const fetchDetails = async () => {
    setLoading(true);
    const response = await apiFetch(`/api/components/shared/SlotInfoDialog/${slot.vehicle_id}`);
    if (response.ok) {
      const { vehicle, profile, activeSession, sessions } = await response.json();
      if (vehicle) setVehicle(vehicle);
      if (profile) setProfile(profile);
      setActiveSession(activeSession || null);
      setRecentSessions(sessions || []);
    }
    setLoading(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return (
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      );
    } catch {
      return ts;
    }
  };

  if (!slot) return null;

  return (
    <div className="slot-info-overlay" onClick={onClose}>
      <div className="slot-info-dialog" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="slot-info-close">✕</button>

        <h2 className="slot-info-title">Vị trí ô đỗ: {slot.slot_name}</h2>
        <span
          className={`slot-info-status ${
            slot.status === 'empty'
              ? 'is-empty'
              : slot.status === 'rented'
              ? 'is-rented'
              : 'is-occupied'
          }`}
        >
          {slot.status === 'empty'
            ? '🟢 ĐANG TRỐNG (Chưa có xe thuê)'
            : slot.status === 'rented'
            ? '🔵 ĐÃ CHO THUÊ CỐ ĐỊNH (Khách tạm thời chưa vào bãi)'
            : slot.status === 'maintenance'
            ? '🟠 ĐANG BẢO TRÌ KỸ THUẬT'
            : '🔴 ĐANG ĐỖ TRONG BÃI (Xe đã thuê & đang đỗ tại ô)'}
        </span>

        {loading ? (
          <p style={{ marginTop: '16px' }}>Đang tải thông tin...</p>
        ) : slot.vehicle_id && vehicle ? (
          <div>
            {/* Real-time Entry/Exit Time Information for Staff/Admin */}
            <div className="slot-info-parking-time-box">
              <h4 className="slot-info-time-title">⏱️ Trạng thái Đỗ xe Thực tế</h4>
              {activeSession ? (
                <div className="slot-time-active">
                  <div className="slot-time-row">
                    <span className="parking-time-icon">🟢</span>
                    <span className="slot-time-label">Thời gian vào bãi:</span>
                    <strong className="slot-time-value">{formatTime(activeSession.entry_time)}</strong>
                  </div>
                  <div className="slot-time-row" style={{ marginTop: '4px' }}>
                    <span className="parking-time-icon">⏳</span>
                    <span className="slot-time-label">Thời gian ra bãi:</span>
                    <span className="slot-time-ongoing">Đang đỗ trong bãi</span>
                  </div>
                </div>
              ) : recentSessions.length > 0 ? (
                <div className="slot-time-history">
                  <div className="slot-time-row">
                    <span className="parking-time-icon">🏁</span>
                    <span className="slot-time-label">Lần đỗ gần nhất:</span>
                  </div>
                  <div className="slot-time-subrow">
                    <span>Vào: <strong>{formatTime(recentSessions[0].entry_time)}</strong></span>
                    <span>Ra: <strong>{formatTime(recentSessions[0].exit_time)}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="slot-time-none">Đã giữ chỗ thuê cố định • Chưa có phiên ra/vào nào được ghi nhận.</p>
              )}
            </div>

            <h3 className="slot-info-section-title">🚗 Thông tin Phương tiện đăng ký</h3>
            <div className="slot-info-vehicle-details">
              <b className="slot-info-label">Biển số cố định:</b> <span className="slot-info-plate">{vehicle.plate}</span>
              <b className="slot-info-label">Loại xe:</b> <span>{vehicle.type}</span>
              <b className="slot-info-label">Hãng / Mẫu xe:</b> <span>{vehicle.brand} {vehicle.model}</span>
              <b className="slot-info-label">Màu sắc:</b> <span>{vehicle.color || 'Tiêu chuẩn'}</span>
            </div>

            {vehicle.image && (
              <img src={vehicle.image} alt="Xe" className="slot-info-image" />
            )}

            <h3 className="slot-info-section-title">👤 Thông tin Chủ xe thuê vị trí</h3>
            {profile ? (
              <div className="slot-info-owner-details">
                <b className="slot-info-label">Họ tên:</b> <span>{profile.name || 'Chưa cập nhật'}</span>
                <b className="slot-info-label">Số điện thoại:</b> <span>{profile.phone || 'Chưa cập nhật'}</span>
                <b className="slot-info-label">Email:</b> <span>{profile.email}</span>
                <b className="slot-info-label">Địa chỉ:</b> <span>{profile.address || 'Chưa cập nhật'}</span>
                <b className="slot-info-label">Mã KH:</b> <span className="slot-info-owner-id">{profile.id}</span>
              </div>
            ) : (
              <p className="slot-info-unavailable">Không tải được thông tin chủ xe.</p>
            )}
          </div>
        ) : (
          <div className="slot-info-empty">
            {slot.status === 'maintenance'
              ? 'Vị trí này hiện đang tạm khóa để bảo trì kỹ thuật.'
              : 'Vị trí này hiện đang trống hoàn toàn, chưa có khách hàng nào thuê cố định.'}
          </div>
        )}
      </div>
    </div>
  );
}
