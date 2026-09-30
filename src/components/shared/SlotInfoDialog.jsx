import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SlotInfoDialog({ slot, onClose }) {
  const [vehicle, setVehicle] = useState(null);
  const [profile, setProfile] = useState(null);
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
    // Fetch vehicle
    const { data: vData } = await supabase.from('vehicles').select('*').eq('id', slot.vehicle_id).single();
    if (vData) {
      setVehicle(vData);
      // Fetch profile
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', vData.user_id).single();
      if (pData) {
        setProfile(pData);
      }
    }
    setLoading(false);
  };

  if (!slot) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90vw', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        
        <h2 style={{ marginTop: 0, marginBottom: '5px' }}>Vị trí: {slot.slot_name}</h2>
        <span style={{ 
          display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px',
          background: slot.status === 'empty' ? '#f0f0f0' : (slot.status === 'rented' ? '#fef9c3' : '#fee2e2'),
          color: slot.status === 'empty' ? '#666' : (slot.status === 'rented' ? '#b45309' : '#b91c1c')
        }}>
          {slot.status === 'empty' ? 'TRỐNG' : (slot.status === 'rented' ? 'ĐÃ THUÊ (Khách chưa vào bãi)' : 'ĐANG ĐỖ (Xe đang trong bãi)')}
        </span>

        {loading ? (
          <p>Đang tải thông tin...</p>
        ) : slot.vehicle_id && vehicle ? (
          <div>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Thông tin Phương tiện</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', fontSize: '14px', marginBottom: '20px' }}>
              <b style={{ color: '#666' }}>Biển số:</b> <span style={{ fontWeight: 'bold', color: '#2a5340' }}>{vehicle.plate}</span>
              <b style={{ color: '#666' }}>Loại xe:</b> <span>{vehicle.type}</span>
              <b style={{ color: '#666' }}>Hiệu xe:</b> <span>{vehicle.brand} {vehicle.model}</span>
              <b style={{ color: '#666' }}>Màu sắc:</b> <span>{vehicle.color}</span>
            </div>

            {vehicle.image && (
              <img src={vehicle.image} alt="Xe" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }} />
            )}

            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Thông tin Chủ xe</h3>
            {profile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', fontSize: '14px' }}>
                <b style={{ color: '#666' }}>Họ tên:</b> <span>{profile.full_name || 'Chưa cập nhật'}</span>
                <b style={{ color: '#666' }}>Email:</b> <span>{profile.email}</span>
                <b style={{ color: '#666' }}>ID:</b> <span style={{ fontSize: '11px', wordBreak: 'break-all' }}>{profile.id}</span>
              </div>
            ) : (
              <p style={{ color: '#888', fontStyle: 'italic' }}>Không tải được thông tin chủ xe.</p>
            )}
          </div>
        ) : (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#888' }}>
            Vị trí này hiện đang trống, chưa có khách hàng nào thuê.
          </div>
        )}
      </div>
    </div>
  );
}
