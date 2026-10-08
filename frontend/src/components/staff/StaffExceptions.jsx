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
      <div className="records-panel">
        <p className="staff-description">Danh sách các xe đang trong bãi. Nhân viên có thể hỗ trợ check-out thủ công nếu AI không nhận diện được lúc ra.</p>

        <table className="records-table">
          <thead>
            <tr className="records-heading">
              <th className="records-cell">Biển số</th>
              <th className="records-cell">Loại xe</th>
              <th className="records-cell">Giờ vào</th>
              <th className="exceptions-actions-heading">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr><td colSpan="4" className="records-empty">Không có phương tiện nào trong bãi.</td></tr>
            ) : exceptions.map(ex => (
              <tr key={ex.id} className="records-row">
                <td className="records-cell"><span className="plate">{ex.vehicles?.plate}</span></td>
                <td className="records-cell">{ex.vehicles?.brand} {ex.vehicles?.model}</td>
                <td className="records-cell">{new Date(ex.entry_time).toLocaleString()}</td>
                <td className="records-cell">
                  <button onClick={() => handleManualOpen(ex)} className="primary exceptions-open-button">Mở Barie</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
