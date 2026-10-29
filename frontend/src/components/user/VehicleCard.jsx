import React from 'react';

export default function VehicleCard({
  vehicle,
  isParked,
  sessionInfo,
  onSelectSlot,
  onEdit,
  onDelete,
  onViewHistory,
  onReportIssue
}) {
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

  const activeSession = sessionInfo?.active;
  const lastSession = sessionInfo?.latest;
  const assignedSlot =
    vehicle.parking_slots && vehicle.parking_slots.length > 0 ? vehicle.parking_slots[0].slot_name : '';

  return (
    <article className="vehicle-card vehicle-card-layout">
      {vehicle.image && <img src={vehicle.image} alt={vehicle.model} className="vehicle-card-image" />}
      <div className="vehicle-content vehicle-card-content">
        <div className="vehicle-card-heading">
          <div>
            <h3 className="vehicle-card-title">
              {vehicle.brand} {vehicle.model}
            </h3>
            <span className="plate">{vehicle.plate}</span>
            <p className="vehicle-card-description">
              {vehicle.type} - {vehicle.color}
            </p>
          </div>
          {isParked ? (
            <span className="vehicle-card-parked">
              <span className="parked-pulse-dot"></span> ĐANG ĐỖ TRONG BÃI
            </span>
          ) : (
            <span className="vehicle-card-outside">NGOÀI BÃI</span>
          )}
        </div>

        {/* Real-time Parking Time Status */}
        <div className="vehicle-parking-time-box">
          {isParked && activeSession ? (
            <div className="parking-time-active">
              <div className="parking-time-row">
                <span className="parking-time-icon">🟢</span>
                <span className="parking-time-label">Thời gian vào bãi:</span>
                <strong className="parking-time-value">{formatTime(activeSession.entry_time)}</strong>
              </div>
              <p className="parking-time-hint">
                Xe hiện đang đỗ tại bãi. Hệ thống sẽ ghi nhận giờ ra khi xe rời bãi.
              </p>
            </div>
          ) : lastSession ? (
            <div className="parking-time-history-preview">
              <div className="parking-time-row">
                <span className="parking-time-icon">🏁</span>
                <span className="parking-time-label">Lần đỗ gần nhất:</span>
              </div>
              <div className="parking-time-subrow">
                <span>
                  Vào: <strong>{formatTime(lastSession.entry_time)}</strong>
                </span>
                <span>
                  Ra: <strong>{formatTime(lastSession.exit_time)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="parking-time-empty">
              <span className="parking-time-icon">ℹ️</span>
              <span>Chưa có dữ liệu ra/vào cho phương tiện này.</span>
            </div>
          )}
        </div>

        <div className="vehicle-card-reservation">
          <div className="vehicle-card-slot-details">
            <span className="vehicle-card-slot-label">Vị trí cố định (1 Slot = 1 Xe): </span>
            {assignedSlot ? (
              <strong className="vehicle-card-slot-name">{assignedSlot}</strong>
            ) : (
              <span className="vehicle-card-unassigned">Chưa chọn</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`secondary vehicle-card-slot-button ${isParked ? 'is-parked' : 'is-available'}`}
              onClick={() => onSelectSlot(vehicle)}
              disabled={isParked}
            >
              {assignedSlot ? 'Đổi chỗ' : 'Chọn chỗ'}
            </button>
            {onReportIssue && (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  onReportIssue({
                    category: 'SPOT_INTRUSION',
                    plate: vehicle.plate,
                    slot_name: assignedSlot || 'Chưa gán',
                    subject: `Báo xe khác đỗ chiếm ô cố định ${assignedSlot || ''} của xe ${vehicle.plate}`,
                    message: `Tôi là chủ xe ${vehicle.plate} (đăng ký ô cố định ${
                      assignedSlot || '1 Slot = 1 Xe'
                    }). Hiện có phương tiện khác đỗ vào vị trí của tôi, nhờ nhân viên trực ban kiểm tra và hỗ trợ ngay.`
                  })
                }
                style={{
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  background: '#fef2f2'
                }}
                title="Báo cho nhân viên khi có xe khác đỗ nhầm vào ô cố định của bạn"
              >
                🚨 Báo chiếm ô
              </button>
            )}
          </div>
        </div>

        <div className="vehicle-card-actions-row">
          {onViewHistory && (
            <button
              type="button"
              className="secondary vehicle-history-button"
              onClick={() => onViewHistory(vehicle)}
              title="Xem lịch sử ra/vào của xe"
            >
              🕒 Lịch sử ra / vào
            </button>
          )}
          <div className="vehicle-card-buttons">
            <button
              className={`secondary vehicle-card-edit-button ${isParked ? 'is-parked' : 'is-available'}`}
              onClick={() => onEdit(vehicle)}
              disabled={isParked}
            >
              Sửa
            </button>
            <button
              className={`secondary vehicle-card-delete-button ${isParked ? 'is-parked' : 'is-available'}`}
              onClick={() => onDelete(vehicle.id)}
              disabled={isParked}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
