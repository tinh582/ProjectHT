import { compareSlots } from '../../lib/slots';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function UserSlotPicker({ vehicle, onClose, onSaved }) {
  const [slots, setSlots] = useState([]);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    const response = await apiFetch(`/api/components/user/UserSlotPicker/${encodeURIComponent(vehicle.type)}`);
    if (response.ok) {
        const allSlots = await response.json();
        if (allSlots && allSlots.length > 0) {
          allSlots.sort(compareSlots);

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
    if (!selectedSlotId || saving) return;

    // If not changed, just close
    if (currentSlot && currentSlot.id === selectedSlotId) {
      onClose();
      return;
    }

    setSaving(true);
    const response = await apiFetch('/api/components/user/UserSlotPicker/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            currentSlotId: currentSlot ? currentSlot.id : null,
            selectedSlotId,
            vehicleId: vehicle.id
        })
    });

    setSaving(false);
    if (response.ok) {
      onSaved();
      onClose();
    } else {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div className="slot-picker-overlay">
      <div className="slot-picker-dialog">
        <h2 className="slot-picker-title">Chọn vị trí đỗ: {vehicle.plate}</h2>
        <p className="slot-picker-description">Loại xe: {vehicle.type} | Vui lòng chọn một vị trí đỗ cố định cho xe của bạn.</p>

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
              const isMine = slot.vehicle_id === vehicle.id;
              const isSelected = selectedSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    if (slot.status === 'empty' || isMine) setSelectedSlotId(slot.id);
                  }}
                  className={`slot-picker-space ${isSelected ? 'is-selected' : !isMine && slot.status === 'rented' ? 'is-rented' : !isMine && slot.status === 'occupied' ? 'is-occupied' : 'is-available'}`}
>
                  <b className={`slot-picker-space-name ${isSelected ? 'is-selected' : 'is-unselected'}`}>{slot.slot_name}</b>
                  {isMine && <span className="slot-picker-owner">Xe của bạn</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="slot-picker-actions">
          <button className="text-button" onClick={onClose}>Hủy</button>
          <button className="primary" onClick={handleSave} disabled={!selectedSlotId || saving}>Xác nhận chọn</button>
        </div>
      </div>
    </div>
  );
}
