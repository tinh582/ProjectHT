import React from 'react';

export default function VehicleCard({ vehicle, isParked, onSelectSlot, onEdit, onDelete }) {
  return (
    <article className="vehicle-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {vehicle.image && (
        <img src={vehicle.image} alt={vehicle.model} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
      )}
      <div className="vehicle-content" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: '0 0 5px' }}>{vehicle.brand} {vehicle.model}</h3>
            <span className="plate">{vehicle.plate}</span>
            <p style={{ margin: '5px 0 0' }}>{vehicle.type} - {vehicle.color}</p>
          </div>
          {isParked && (
            <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
              ĐANG ĐỖ TRONG BÃI
            </span>
          )}
        </div>
        
        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '6px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: '#666' }}>Vị trí cố định: </span>
            {vehicle.parking_slots && vehicle.parking_slots.length > 0 ? (
              <strong style={{ color: '#2a5340' }}>{vehicle.parking_slots[0].slot_name}</strong>
            ) : (
              <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa chọn</span>
            )}
          </div>
          <button 
            className="secondary" 
            onClick={() => onSelectSlot(vehicle)} 
            disabled={isParked}
            style={{ padding: '4px 8px', fontSize: '11px', opacity: isParked ? 0.5 : 1, cursor: isParked ? 'not-allowed' : 'pointer' }}
          >
            {vehicle.parking_slots && vehicle.parking_slots.length > 0 ? 'Đổi chỗ' : 'Chọn chỗ'}
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '12px' }}>
          <button className="secondary" onClick={() => onEdit(vehicle)} disabled={isParked} style={{ padding: '6px 12px', fontSize: '13px', opacity: isParked ? 0.5 : 1, cursor: isParked ? 'not-allowed' : 'pointer' }}>Sửa</button>
          <button className="secondary" onClick={() => onDelete(vehicle.id)} disabled={isParked} style={{ padding: '6px 12px', fontSize: '13px', color: isParked ? '#ccc' : '#ff4d4f', borderColor: isParked ? '#ccc' : '#ff4d4f', cursor: isParked ? 'not-allowed' : 'pointer' }}>Xóa</button>
        </div>
      </div>
    </article>
  );
}
