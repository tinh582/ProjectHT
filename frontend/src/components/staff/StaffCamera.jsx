import React, { useState } from 'react';

export default function StaffCamera() {
  const [cameraEvents] = useState([
    { id: 1, plate: '81-AA12876', type: 'IN', time: '10:45:00', confidence: 98 },
    { id: 2, plate: '29-B19875', type: 'OUT', time: '10:42:15', confidence: 85 }
  ]);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONITORING</p>
          <h1>Giám sát Camera & Làn xe<span>.</span></h1>
        </div>
      </div>
      <div className="camera-monitor-grid">
        <div className="camera-monitor-feed">
          <div className="camera-monitor-label">
            <span className="camera-monitor-live"></span>
            <span className="camera-monitor-lane">LÀN VÀO - CAM 1</span>
          </div>
          <span className="camera-monitor-icon">🎥</span>
          <p className="camera-monitor-placeholder">Tín hiệu đang truyền tải...</p>
        </div>
        <div className="camera-monitor-feed">
          <div className="camera-monitor-label">
            <span className="camera-monitor-live"></span>
            <span className="camera-monitor-lane">LÀN RA - CAM 2</span>
          </div>
          <span className="camera-monitor-icon">🎥</span>
          <p className="camera-monitor-placeholder">Tín hiệu đang truyền tải...</p>
        </div>
      </div>
      <div className="camera-events-panel">
        <h3 className="camera-events-title">Nhật ký AI Nhận diện (Mô phỏng)</h3>
        <div className="camera-events-list">
          {cameraEvents.map(ev => (
            <div key={ev.id} className="camera-event">
              <div className="camera-event-vehicle">
                <span className={`camera-event-direction ${ev.type === 'IN' ? 'is-in' : 'is-out'}`}>{ev.type}</span>
                <span className="plate">{ev.plate}</span>
              </div>
              <div className="camera-event-details">
                <span>Độ chính xác: <b className={`camera-event-confidence ${ev.confidence > 90 ? 'is-high' : 'is-low'}`}>{ev.confidence}%</b></span>
                <span>{ev.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
