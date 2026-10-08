import React from 'react';

export default function VehicleCard({ vehicle, isParked, onSelectSlot, onEdit, onDelete }) {
  return (
    <article className="vehicle-card vehicle-card-layout">
      {vehicle.image && (
        <img src={vehicle.image} alt={vehicle.model} className="vehicle-card-image" />
      )}
      <div className="vehicle-content vehicle-card-content">
        <div className="vehicle-card-heading">
          <div>
            <h3 className="vehicle-card-title">{vehicle.brand} {vehicle.model}</h3>
            <span className="plate">{vehicle.plate}</span>
            <p className="vehicle-card-description">{vehicle.type} - {vehicle.color}</p>
          </div>
          {isParked && (
            <span className="vehicle-card-parked">
              ĐANG ĐỖ TRONG BÃI
            </span>
          )}
        </div>

        <div className="vehicle-card-reservation">
          <div className="vehicle-card-slot-details">
            <span className="vehicle-card-slot-label">Vị trí cố định: </span>
            {vehicle.parking_slots && vehicle.parking_slots.length > 0 ? (
              <strong className="vehicle-card-slot-name">{vehicle.parking_slots[0].slot_name}</strong>
            ) : (
              <span className="vehicle-card-unassigned">Chưa chọn</span>
            )}
          </div>
          <button
            className={`secondary vehicle-card-slot-button ${isParked ? 'is-parked' : 'is-available'}`}
            onClick={() => onSelectSlot(vehicle)}
            disabled={isParked}
>
            {vehicle.parking_slots && vehicle.parking_slots.length > 0 ? 'Đổi chỗ' : 'Chọn chỗ'}
          </button>
        </div>

        <div className="vehicle-card-buttons">
          <button className={`secondary vehicle-card-edit-button ${isParked ? 'is-parked' : 'is-available'}`} onClick={() => onEdit(vehicle)} disabled={isParked}>Sửa</button>
          <button className={`secondary vehicle-card-delete-button ${isParked ? 'is-parked' : 'is-available'}`} onClick={() => onDelete(vehicle.id)} disabled={isParked}>Xóa</button>
        </div>
      </div>
    </article>
  );
}
