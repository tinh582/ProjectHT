import React, { useState, useEffect } from 'react';

export default function UserSlotPicker({ vehicle, onClose, onSaved }) {
  const [slots, setSlots] = useState([]);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    const response = await fetch(`http://localhost:5000/api/components/user/UserSlotPicker/${encodeURIComponent(vehicle.type)}`);
    if (response.ok) {
        const allSlots = await response.json();
        if (allSlots && allSlots.length > 0) {
          allSlots.sort((a, b) => {
            const numA = parseInt(a.slot_name.split('-')[1]) || 0;
            const numB = parseInt(b.slot_name.split('-')[1]) || 0;
            return numA - numB;
          });
          
          setSlots(allSlots);
          
          const mine = allSlots.find(s => s.vehicle_id === vehicle.id);
          if (mine) {
            setCurrentSlot(mine);
            setSelectedSlotId(mine.id);
          }
        }
    }
    setLoading(false);
  };

  const handleRandom = () => {
    const emptySlots = slots.filter(s => s.status === 'empty');
    if (emptySlots.length > 0) {
      const random = emptySlots[Math.floor(Math.random() * emptySlots.length)];
      setSelectedSlotId(random.id);
    } else {
      alert('Không còn vị trí trống nào!');
    }
  };

  const handleAuto = () => {
    // Just pick the first empty slot
    const emptySlots = slots.filter(s => s.status === 'empty');
    if (emptySlots.length > 0) {
      setSelectedSlotId(emptySlots[0].id);
    } else {
      alert('Không còn vị trí trống nào!');
    }
  };

  const handleSave = async () => {
    if (!selectedSlotId) return;
    
    // If not changed, just close
    if (currentSlot && currentSlot.id === selectedSlotId) {
      onClose();
      return;
    }

    const response = await fetch('http://localhost:5000/api/components/user/UserSlotPicker/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            currentSlotId: currentSlot ? currentSlot.id : null,
            selectedSlotId,
            vehicleId: vehicle.id
        })
    });

    if (response.ok) {
      onSaved();
      onClose();
    } else {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '800px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Chọn vị trí đỗ: {vehicle.plate}</h2>
        <p style={{ color: '#666' }}>Loại xe: {vehicle.type} | Vui lòng chọn một vị trí đỗ cố định cho xe của bạn.</p>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <button className="secondary" onClick={handleAuto}>Tự động chọn (Gần nhất)</button>
          <button className="secondary" onClick={handleRandom}>Chọn ngẫu nhiên</button>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#fff', border: '1px solid #ccc', borderRadius: '2px' }}></div> Trống (Có thể chọn)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#fef9c3', border: '1px solid #eab308', borderRadius: '2px' }}></div> Đã thuê (Không thể chọn)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '2px' }}></div> Đang đỗ (Không thể chọn)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '2px' }}></div> Đang chọn</span>
        </div>

        {loading ? <p>Đang tải sơ đồ...</p> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea', minHeight: '300px' }}>
            {slots.length === 0 ? <p>Chưa có vị trí đỗ nào được thiết lập cho loại xe này.</p> : slots.map(slot => {
              const isMine = slot.vehicle_id === vehicle.id;
              const isSelected = selectedSlotId === slot.id;
              
              let bg = '#fff';
              let border = '#ccc';
              let cursor = 'pointer';
              
              if (slot.status === 'rented' && !isMine) { bg = '#fef9c3'; border = '#eab308'; cursor = 'not-allowed'; }
              else if (slot.status === 'occupied' && !isMine) { bg = '#fee2e2'; border = '#ef4444'; cursor = 'not-allowed'; }
              
              if (isSelected) {
                bg = '#ecfdf5';
                border = '#10b981';
                cursor = 'pointer';
              }

              return (
                <div 
                  key={slot.id} 
                  onClick={() => {
                    if (slot.status === 'empty' || isMine) setSelectedSlotId(slot.id);
                  }}
                  style={{ 
                    width: '60px', height: '60px', 
                    background: bg, border: isSelected ? `2px solid ${border}` : `1px solid ${border}`, 
                    borderRadius: '6px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: cursor,
                    transition: 'all 0.2s'
                  }}
                >
                  <b style={{ fontSize: '13px', color: isSelected ? '#10b981' : '#333' }}>{slot.slot_name}</b>
                  {isMine && <span style={{ fontSize: '9px', color: '#10b981' }}>Xe của bạn</span>}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px' }}>
          <button className="text-button" onClick={onClose}>Hủy</button>
          <button className="primary" onClick={handleSave} disabled={!selectedSlotId}>Xác nhận chọn</button>
        </div>
      </div>
    </div>
  );
}
