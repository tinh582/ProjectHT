import { groupSlotsByZone } from '../../lib/slots';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import SlotInfoDialog from '../shared/SlotInfoDialog';

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [slotsByZone, setSlotsByZone] = useState({});
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const [selectedSlotForInfo, setSelectedSlotForInfo] = useState(null);

  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState('Xe máy');
  const [newZoneCapacity, setNewZoneCapacity] = useState('');

  useEffect(() => {
    fetchZones();
    fetchSlots();
  }, []);

  const fetchZones = async () => {
    const response = await apiFetch('/api/components/admin/AdminZones/zones');
    if (response.ok) {
      const data = await response.json();
      setZones(data || []);
    }
  };

  const fetchSlots = async () => {
    const response = await apiFetch('/api/components/admin/AdminZones/slots');
    if (response.ok) {
      const data = await response.json();
      if (data) {
      setSlotsByZone(groupSlotsByZone(data));
      }
    }
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneName || !newZoneCapacity) return;
    const capacity = parseInt(newZoneCapacity);

    const response = await apiFetch('/api/components/admin/AdminZones/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone_name: newZoneName, vehicle_type: newZoneType, total_capacity: capacity })
    });

    if (response.ok) {
      setNewZoneName('');
      setNewZoneCapacity('');
      fetchZones();
      fetchSlots();
    } else {
      alert("Error adding zone");
    }
  };

  const handleDeleteZone = async (id) => {
    if(window.confirm('Xóa khu vực này sẽ xóa toàn bộ danh sách Slot bên trong. Tiếp tục?')) {
      const response = await apiFetch(`/api/components/admin/AdminZones/zones/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchZones();
        fetchSlots();
      }
    }
  };

  const generateMissingSlots = async (zone) => {
    if(window.confirm(`Tạo ${zone.total_capacity} vị trí đỗ cho ${zone.zone_name}?`)) {
      const response = await apiFetch(`/api/components/admin/AdminZones/zones/${zone.id}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_name: zone.zone_name, total_capacity: zone.total_capacity })
      });
      if (response.ok) fetchSlots();
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FACILITY</p>
          <h1>Quản lý bãi đỗ<span>.</span></h1>
        </div>
      </div>
      <div className="panel">
        <form onSubmit={handleAddZone} className="inline-form">
          <label>Tên khu vực
            <input value={newZoneName} onChange={e => setNewZoneName(e.target.value)} required placeholder="VD: Khu A1" />
          </label>
          <label>Loại xe
            <select value={newZoneType} onChange={e => setNewZoneType(e.target.value)}>
              <option value="Xe máy">Xe máy</option>
              <option value="Ô tô">Ô tô</option>
            </select>
          </label>
          <label>Sức chứa (Tổng số Slot)
            <input type="number" value={newZoneCapacity} onChange={e => setNewZoneCapacity(e.target.value)} required />
          </label>
          <button type="submit" className="primary admin-add-button">Thêm</button>
        </form>

        <div className="panel-flex">
          {zones.map(z => {
            const hasSlots = slotsByZone[z.id] && slotsByZone[z.id].length > 0;
            const isExpanded = expandedZoneId === z.id;

            return (
              <div key={z.id} className="zone-card">
                <div className="zone-header">
                  <div className="zone-details">
                    <div className="zone-heading-row">
                      <h3 className="zone-title">{z.zone_name}</h3>
                      <span className="zone-type-badge">{z.vehicle_type}</span>
                    </div>
                    <p className="zone-summary">
                      Sức chứa: {z.total_capacity} | Hiện tại: {z.current_occupancy}
                    </p>
                  </div>

                  <div className="zone-actions">
                    {!hasSlots ? (
                      <button onClick={() => generateMissingSlots(z)} className="primary zone-action-button">Tạo danh sách Slot</button>
                    ) : (
                      <button onClick={() => setExpandedZoneId(isExpanded ? null : z.id)} className="secondary zone-action-button">
                        {isExpanded ? 'Đóng Bản đồ Slot' : 'Xem Bản đồ Slot'}
                      </button>
                    )}
                    <button onClick={() => handleDeleteZone(z.id)} className="secondary zone-delete-button">Xóa Khu vực</button>
                  </div>
                </div>

                {isExpanded && hasSlots && (
                  <div className="slot-map-container">
                    <h4 className="zone-map-title">Bản đồ Vị trí đỗ ({slotsByZone[z.id].length} vị trí)</h4>
                    <div className="slot-legend">
                      <span className="legend-item"><div className="legend-box empty"></div> Trống (Empty)</span>
                      <span className="legend-item"><div className="legend-box rented"></div> Đã thuê (Rented)</span>
                      <span className="legend-item"><div className="legend-box occupied"></div> Đang đỗ (Occupied)</span>
                    </div>

                    <div className="slot-grid">
                      {slotsByZone[z.id].map(slot => {
                        let statusClass = 'empty';
                        if (slot.status === 'rented') statusClass = 'rented';
                        if (slot.status === 'occupied') statusClass = 'occupied';

                        return (
                          <div
                            key={slot.id}
                            onClick={() => setSelectedSlotForInfo(slot)}
                            className={`slot-box ${statusClass} clickable`}
                            title={slot.vehicles ? `Xe: ${slot.vehicles.plate}` : 'Trống'}
>
                            <b className="zone-slot-name">{slot.slot_name}</b>
                            {slot.vehicles && <span className="zone-slot-plate">{slot.vehicles.plate}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {zones.length === 0 && <p className="zone-empty-message">Chưa có khu vực nào được thiết lập.</p>}
        </div>
      </div>

      {selectedSlotForInfo && (
        <SlotInfoDialog
          slot={selectedSlotForInfo}
          onClose={() => setSelectedSlotForInfo(null)}
        />
      )}
    </div>
  );
}
