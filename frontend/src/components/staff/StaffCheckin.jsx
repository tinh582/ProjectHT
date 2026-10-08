import { apiFetch } from '../../lib/api';
import React, { useState } from 'react';

export default function StaffCheckin() {
  const [plateInput, setPlateInput] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!plateInput || isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await apiFetch('/api/components/staff/StaffCheckin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plateInput })
      });
      if (response.ok) {
        const data = await response.json();
        setLogMessage(data.logMessage || 'Lỗi không xác định');
      } else {
        const data = await response.json();
        setLogMessage(data.error || 'Không thể cập nhật phiên đỗ xe.');
      }
    } catch (error) {
      setLogMessage('❌ Lỗi kết nối đến server: ' + error.message);
    } finally {
      setIsProcessing(false);
    }

    setPlateInput('');
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TERMINAL</p>
          <h1>Nhập liệu thủ công<span>.</span></h1>
        </div>
      </div>

      <div className="checkin-panel">
        <p className="staff-description">Nhập biển số xe (VD: 81-AA12876) để thực hiện check-in hoặc check-out thủ công.</p>
        <form onSubmit={handleManualCheckIn} className="checkin-form">
          <input
            type="text"
            value={plateInput}
            onChange={e => setPlateInput(e.target.value)}
            placeholder="Nhập biển số xe..."
            className="checkin-plate-input"
            required
          />
          <button type="submit" className="primary" disabled={isProcessing}>{isProcessing ? 'Đang xử lý...' : 'Xác nhận'}</button>
        </form>

        {logMessage && (
          <div className={`checkin-message ${logMessage.includes('❌') ? 'is-error' : 'is-success'}`}>
            {logMessage}
          </div>
        )}
      </div>
    </div>
  );
}
