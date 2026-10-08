import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function StaffExceptions() {
  const [exceptions, setExceptions] = useState([]);

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    const response = await apiFetch('/api/components/staff/StaffExceptions');
    if (response.ok) {
      const data = await response.json();
      setExceptions(data || []);
    }
  };

  const handleManualOpen = async (session) => {
    if (window.confirm('Xác nhận mở Barie và hoàn tất phiên đỗ xe này?')) {
      const response = await apiFetch(`/api/components/staff/StaffExceptions/${session.id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      if (response.ok) fetchExceptions();
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXCEPTIONS</p>
          <h1>Xử lý ngoại lệ<span>.</span></h1>
        </div>
      </div>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
        <p style={{ color: '#666', marginBottom: '20px' }}>Danh sách các xe đang trong bãi. Nhân viên có thể hỗ trợ check-out thủ công nếu AI không nhận diện được lúc ra.</p>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eaeaea', background: '#f9faf9' }}>
              <th style={{ padding: '12px' }}>Biển số</th>
              <th style={{ padding: '12px' }}>Loại xe</th>
              <th style={{ padding: '12px' }}>Giờ vào</th>
              <th style={{ padding: '12px', width: '120px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Không có phương tiện nào trong bãi.</td></tr>
            ) : exceptions.map(ex => (
              <tr key={ex.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                <td style={{ padding: '12px' }}><span className="plate">{ex.vehicles?.plate}</span></td>
                <td style={{ padding: '12px' }}>{ex.vehicles?.brand} {ex.vehicles?.model}</td>
                <td style={{ padding: '12px' }}>{new Date(ex.entry_time).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleManualOpen(ex)} className="primary" style={{ padding: '8px 12px', fontSize: '11px', background: '#c95f55' }}>Mở Barie</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
