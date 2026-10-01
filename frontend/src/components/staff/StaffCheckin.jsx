import React, { useState } from 'react';

export default function StaffCheckin() {
  const [plateInput, setPlateInput] = useState('');
  const [logMessage, setLogMessage] = useState('');

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!plateInput) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/components/staff/StaffCheckin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plateInput })
      });
      if (response.ok) {
        const data = await response.json();
        setLogMessage(data.logMessage || 'Lỗi không xác định');
      } else {
        setLogMessage('❌ Lỗi kết nối đến server');
      }
    } catch (error) {
      setLogMessage('❌ Lỗi kết nối đến server: ' + error.message);
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
      
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eaeaea', maxWidth: '600px' }}>
        <p style={{ color: '#666', marginBottom: '20px' }}>Nhập biển số xe (VD: 81-AA12876) để thực hiện check-in hoặc check-out thủ công.</p>
        <form onSubmit={handleManualCheckIn} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={plateInput} 
            onChange={e => setPlateInput(e.target.value)} 
            placeholder="Nhập biển số xe..." 
            style={{ textTransform: 'uppercase', flex: 1 }} 
            required 
          />
          <button type="submit" className="primary">Xác nhận</button>
        </form>
        
        {logMessage && (
          <div style={{ marginTop: '20px', padding: '15px', background: logMessage.includes('❌') ? '#feebeb' : '#edf2e7', color: logMessage.includes('❌') ? '#b33a32' : '#2a5340', borderRadius: '8px', fontWeight: '500' }}>
            {logMessage}
          </div>
        )}
      </div>
    </div>
  );
}
