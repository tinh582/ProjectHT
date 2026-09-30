import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function StaffExceptions() {
  const [exceptions, setExceptions] = useState([]);

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    // For this mockup, we just fetch all active sessions to display them
    const { data, error } = await supabase.from('parking_sessions').select('*, vehicles(id, user_id, type, plate, brand, model)').eq('status', 'active');
    if (!error) setExceptions(data || []);
  };

  const handleManualOpen = async (session) => {
    if (window.confirm('Xác nhận mở Barie và hoàn tất phiên đỗ xe này?')) {
      const { error } = await supabase.from('parking_sessions').update({ status: 'completed', exit_time: new Date().toISOString() }).eq('id', session.id);
      
      if (!error) {
        // Decrease zone occupancy
        if (session.vehicles?.type) {
          const { data: zones } = await supabase.from('parking_zones').select('*').eq('vehicle_type', session.vehicles.type).order('current_occupancy', { ascending: true });
          const targetZone = zones && zones.length > 0 ? zones[0] : null;
          if (targetZone) {
            await supabase.from('parking_zones').update({ current_occupancy: Math.max(0, targetZone.current_occupancy - 1) }).eq('id', targetZone.id);
          }
        }
        
        // Send notification
        if (session.vehicles?.user_id) {
          await supabase.from('notifications').insert([{
            user_id: session.vehicles.user_id,
            title: 'Xe đã ra khỏi bãi (Mở thủ công)',
            message: `Xe ${session.vehicles.brand} ${session.vehicles.model} (${session.vehicles.plate}) đã được mở Barie thủ công lúc ${new Date().toLocaleTimeString()}`
          }]);
        }
        
        fetchExceptions();
      }
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
