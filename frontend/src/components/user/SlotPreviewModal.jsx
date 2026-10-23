import { compareSlots } from '../../lib/slots';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function SlotPreviewModal({ vehicleType = 'Ô tô', onSelectSlot, onClose }) {
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlots();
  }, [vehicleType]);

  const fetchSlots = async () => {
    setLoading(true);
    const response = await apiFetch(`/api/components/user/UserSlotPicker/${encodeURIComponent(vehicleType)}`);
    if (response.ok) {
        const allSlots = await response.json();
        if (allSlots && allSlots.length > 0) {
          allSlots.sort(compareSlots);
          setSlots(allSlots);
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

  const handleSave = () => {
    if (!selectedSlotId) return;
    const chosen = slots.find(s => s.id === selectedSlotId);
    if (chosen) {
      onSelectSlot(chosen);
      onClose();
    }
  };

  const emptySlotsCount = slots.filter(s => s.status === 'empty').length;

  return (
    <div className="slot-picker-overlay" style={{ zIndex: 1200 }}>
      <div className="slot-picker-dialog" style={{ maxWidth: '720px' }}>
        <h2 className="slot-picker-title">Sơ đồ bãi đỗ (Xem trước & Chọn vị trí)</h2>
        <p className="slot-picker-description">Loại xe: {vehicleType} | Vị trí thực tế còn trống: <strong>{emptySlotsCount}</strong> slot</p>

        {/* Technical Infrastructure Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          margin: '12px 0',
          padding: '10px',
          background: '#f8fafc',
          borderRadius: '8px',
          fontSize: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div>💧 Thoát nước: <strong>Tốt (Chống ngập)</strong></div>
          <div>📡 Cảm biến: <strong>Hoạt động 100%</strong></div>
          <div>📹 Camera AI: <strong>24/7 Góc rộng</strong></div>
          <div>💡 Chiếu sáng: <strong>LED cảm ứng</strong></div>
        </div>

        <div className="slot-picker-suggestions">
          <button className="secondary" onClick={handleAuto}>Tự động chọn (Gần nhất)</button>
          <button className="secondary" onClick={handleRandom}>Chọn ngẫu nhiên</button>
        </div>

        <div className="slot-picker-legend">
          <span className="slot-picker-legend-item"><div className="slot-picker-legend-empty"></div> Trống (Có thể chọn)</span>
          <span className="slot-picker-legend-item"><div className="slot-picker-legend-rented"></div> Đã thuê (Không thể chọn)</span>
          <span className="slot-picker-legend-item"><div className="slot-picker-legend-occupied"></div> Đang đỗ (Không thể chọn)</span>
          <span className="slot-picker-legend-item"><div className="slot-picker-legend-selected"></div> Đang chọn</span>
        </div>

        {loading ? <p>Đang tải sơ đồ...</p> : (
          <div className="slot-picker-grid">
            {slots.length === 0 ? <p>Chưa có vị trí đỗ nào được thiết lập cho loại xe này.</p> : slots.map(slot => {
              const isSelected = selectedSlotId === slot.id;
              const isAvailable = slot.status === 'empty';

              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    if (isAvailable) setSelectedSlotId(slot.id);
                  }}
                  className={`slot-picker-space ${isSelected ? 'is-selected' : slot.status === 'rented' ? 'is-rented' : slot.status === 'occupied' ? 'is-occupied' : 'is-available'}`}
                >
                  <b className={`slot-picker-space-name ${isSelected ? 'is-selected' : 'is-unselected'}`}>{slot.slot_name}</b>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    {isAvailable ? 'Trống' : slot.status === 'rented' ? 'Đã thuê' : 'Có xe'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="slot-picker-actions">
          <button className="text-button" onClick={onClose}>Hủy</button>
          <button className="primary" onClick={handleSave} disabled={!selectedSlotId}>
            {selectedSlotId ? 'Xác nhận chọn vị trí này →' : 'Vui lòng chọn 1 vị trí trống'}
          </button>
        </div>
      </div>
    </div>
  );
}
