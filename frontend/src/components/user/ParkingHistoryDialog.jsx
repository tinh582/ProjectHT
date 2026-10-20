import React from 'react';

export default function ParkingHistoryDialog({ vehicle, sessions, onClose }) {
  const formatTime = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return ts;
    }
  };

  const calculateDuration = (entry, exit) => {
    if (!entry) return '-';
    const start = new Date(entry).getTime();
    const end = exit ? new Date(exit).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`);

    return parts.join(' ');
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content md parking-history-modal" onClick={e => e.stopPropagation()}>
        <div className="parking-history-header">
          <div>
            <p className="eyebrow">NHẬT KÝ RA VÀO BÃI ĐỖ</p>
            <h3 className="users-dialog-title" style={{ margin: 0 }}>
              {vehicle.brand} {vehicle.model} <span className="plate" style={{ marginLeft: '8px' }}>{vehicle.plate}</span>
            </h3>
          </div>
          <button type="button" className="slot-info-close" onClick={onClose}>✕</button>
        </div>

        <p className="users-dialog-desc" style={{ marginTop: '8px', marginBottom: '16px' }}>
          Chi tiết các lần xe bắt đầu vào đỗ và rời khỏi bãi xe.
        </p>

        {(!sessions || sessions.length === 0) ? (
          <div className="parking-history-empty">
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📭</span>
            Chưa có lịch sử đỗ xe nào được ghi nhận cho phương tiện này.
          </div>
        ) : (
          <div className="parking-history-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Thời gian vào</th>
                  <th>Thời gian ra</th>
                  <th>Thời lượng đỗ</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const isActive = s.status === 'active';
                  return (
                    <tr key={s.id}>
                      <td>
                        {isActive ? (
                          <span className="history-badge-active">
                            <span className="parked-pulse-dot"></span> Đang đỗ
                          </span>
                        ) : (
                          <span className="history-badge-completed">Đã rời bãi</span>
                        )}
                      </td>
                      <td>
                        <strong className="history-time-text">{formatTime(s.entry_time)}</strong>
                      </td>
                      <td>
                        {isActive ? (
                          <span className="history-ongoing">Chưa ra bãi</span>
                        ) : (
                          <strong className="history-time-text">{formatTime(s.exit_time)}</strong>
                        )}
                      </td>
                      <td>
                        <span className="history-duration">{calculateDuration(s.entry_time, s.exit_time)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="users-dialog-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
