import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

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
    const response = await apiFetch(`/api/components/shared/SlotInfoDialog/${slot.vehicle_id}`);
    if (response.ok) {
      const { vehicle, profile } = await response.json();
      if (vehicle) setVehicle(vehicle);
      if (profile) setProfile(profile);
    }
    setLoading(false);
  };

  if (!slot) return null;

  return (
    <div className="slot-info-overlay">
      <div className="slot-info-dialog">
        <button onClick={onClose} className="slot-info-close">✕</button>

        <h2 className="slot-info-title">Vị trí: {slot.slot_name}</h2>
        <span className={`slot-info-status ${slot.status === 'empty' ? 'is-empty' : slot.status === 'rented' ? 'is-rented' : 'is-occupied'}`}>
          {slot.status === 'empty' ? 'TRỐNG' : (slot.status === 'rented' ? 'ĐÃ THUÊ (Khách chưa vào bãi)' : 'ĐANG ĐỖ (Xe đang trong bãi)')}
        </span>

        {loading ? (
          <p>Đang tải thông tin...</p>
        ) : slot.vehicle_id && vehicle ? (
          <div>
            <h3 className="slot-info-section-title">Thông tin Phương tiện</h3>
            <div className="slot-info-vehicle-details">
              <b className="slot-info-label">Biển số:</b> <span className="slot-info-plate">{vehicle.plate}</span>
              <b className="slot-info-label">Loại xe:</b> <span>{vehicle.type}</span>
              <b className="slot-info-label">Hiệu xe:</b> <span>{vehicle.brand} {vehicle.model}</span>
              <b className="slot-info-label">Màu sắc:</b> <span>{vehicle.color}</span>
            </div>

            {vehicle.image && (
              <img src={vehicle.image} alt="Xe" className="slot-info-image" />
            )}

            <h3 className="slot-info-section-title">Thông tin Chủ xe</h3>
            {profile ? (
              <div className="slot-info-owner-details">
                <b className="slot-info-label">Họ tên:</b> <span>{profile.name || 'Chưa cập nhật'}</span>
                <b className="slot-info-label">Email:</b> <span>{profile.email}</span>
                <b className="slot-info-label">ID:</b> <span className="slot-info-owner-id">{profile.id}</span>
              </div>
            ) : (
              <p className="slot-info-unavailable">Không tải được thông tin chủ xe.</p>
            )}
          </div>
        ) : (
          <div className="slot-info-empty">
            Vị trí này hiện đang trống, chưa có khách hàng nào thuê.
          </div>
        )}
      </div>
    </div>
  );
}
