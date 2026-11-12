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
            ? '🟢 ĐANG TRỐNG'
            : slot.status === 'rented'
            ? '🟡 ĐÃ THUÊ (Xe đang ở ngoài)'
            : '🔴 ĐANG ĐỖ TRONG BÃI'}
        </span>

        {loading ? (
          <p style={{ marginTop: '12px' }}>Đang tải thông tin...</p>
        ) : slot.vehicle_id && vehicle ? (
          <div>
            {/* Compact Entry/Exit Time Information */}
            <div className="slot-info-parking-time-box" style={{ padding: '10px 12px', marginBottom: '10px' }}>
              {activeSession ? (
                <div className="slot-time-active" style={{ fontSize: '12.5px' }}>
                  <div>🟢 <b>Giờ vào bãi:</b> {formatTime(activeSession.entry_time)}</div>
                  <div style={{ marginTop: '3px', color: '#059669', fontWeight: 700 }}>⏳ Đang đỗ trong bãi</div>
                </div>
              ) : recentSessions.length > 0 ? (
                <div className="slot-time-history" style={{ fontSize: '12.5px' }}>
                  <div>🏁 <b>Lần đỗ gần nhất:</b></div>
                  <div style={{ marginTop: '2px' }}>
                    Vào: <strong>{formatTime(recentSessions[0].entry_time)}</strong> • Ra: <strong>{formatTime(recentSessions[0].exit_time)}</strong>
                  </div>
                </div>
              ) : (
                <p className="slot-time-none" style={{ margin: 0, fontSize: '12.5px' }}>
                  Đã thuê cố định • Chưa có lượt ra/vào bãi.
                </p>
              )}
            </div>

            <h3 className="slot-info-section-title">🚗 Phương tiện đăng ký</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
              <div className="slot-info-vehicle-details" style={{ flex: 1, marginBottom: 0 }}>
                <b className="slot-info-label">Biển số:</b> <span className="slot-info-plate">{vehicle.plate}</span>
                <b className="slot-info-label">Loại xe:</b> <span>{vehicle.type}</span>
                <b className="slot-info-label">Hãng / Mẫu:</b> <span>{vehicle.brand} {vehicle.model}</span>
                <b className="slot-info-label">Màu sắc:</b> <span>{vehicle.color || 'Tiêu chuẩn'}</span>
              </div>
              {vehicle.image && (
                <img
                  src={vehicle.image}
                  alt="Xe"
                  style={{
                    width: '120px',
                    height: '84px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    flexShrink: 0
                  }}
                />
              )}
            </div>

            <h3 className="slot-info-section-title">👤 Chủ xe thuê vị trí</h3>
            {profile ? (
              <div className="slot-info-owner-details">
                <b className="slot-info-label">Họ tên:</b> <span>{profile.name || 'Chưa cập nhật'}</span>
                <b className="slot-info-label">Số điện thoại:</b> <span>{profile.phone || 'Chưa cập nhật'}</span>
                <b className="slot-info-label">Email:</b> <span>{profile.email}</span>
                <b className="slot-info-label">Địa chỉ:</b> <span>{profile.address || 'Chưa cập nhật'}</span>
              </div>
            ) : (
              <p className="slot-info-unavailable">Không tải được thông tin chủ xe.</p>
            )}
          </div>
        ) : (
          <div className="slot-info-empty">
            Vị trí này hiện đang trống, chưa có phương tiện đăng ký thuê.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <button type="button" className="secondary" onClick={onClose} style={{ padding: '6px 18px' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
