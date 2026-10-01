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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#0a0a0a', height: '280px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '2px solid #222', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, background: 'red', borderRadius: '50%', display: 'inline-block' }}></span> 
            <span style={{ fontSize: '11px', letterSpacing: '1px' }}>LÀN VÀO - CAM 1</span>
          </div>
          <span style={{ fontSize: '40px', opacity: 0.2 }}>🎥</span>
          <p style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>Tín hiệu đang truyền tải...</p>
        </div>
        <div style={{ background: '#0a0a0a', height: '280px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '2px solid #222', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, background: 'red', borderRadius: '50%', display: 'inline-block' }}></span> 
            <span style={{ fontSize: '11px', letterSpacing: '1px' }}>LÀN RA - CAM 2</span>
          </div>
          <span style={{ fontSize: '40px', opacity: 0.2 }}>🎥</span>
          <p style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>Tín hiệu đang truyền tải...</p>
        </div>
      </div>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea', marginTop: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Nhật ký AI Nhận diện (Mô phỏng)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {cameraEvents.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f5f7f5', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ background: ev.type === 'IN' ? '#e2f0e5' : '#f0e2e2', color: ev.type === 'IN' ? '#2a5340' : '#8c2b2b', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{ev.type}</span>
                <span className="plate">{ev.plate}</span>
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#666' }}>
                <span>Độ chính xác: <b style={{ color: ev.confidence > 90 ? 'green' : 'orange' }}>{ev.confidence}%</b></span>
                <span>{ev.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
