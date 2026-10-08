import { groupSlotsByZone } from '../../lib/slots';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import SlotInfoDialog from '../shared/SlotInfoDialog';

export default function StaffSlotMap() {
  const [zones, setZones] = useState([]);
  const [slotsByZone, setSlotsByZone] = useState({});
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlotForInfo, setSelectedSlotForInfo] = useState(null);

  useEffect(() => {
    fetchZonesAndSlots();
  }, []);

  const fetchZonesAndSlots = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/components/staff/StaffSlotMap');
      if (response.ok) {
        const { zones: zData, slots: sData } = await response.json();
        if (zData) setZones(zData);

        if (sData) {
          setSlotsByZone(groupSlotsByZone(sData));
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FACILITY MAP</p>
          <h1>Sơ đồ bãi đỗ<span>.</span></h1>
        </div>
        <button className="secondary" onClick={fetchZonesAndSlots}>Làm mới sơ đồ</button>
      </div>

      <div className="panel">
        <p className="staff-description">Danh sách các vị trí đỗ cố định. Nhân viên có thể xem trực tiếp để biết vị trí nào đang trống, đã cho thuê, hoặc đang có xe đậu sai quy định.</p>

        {loading ? <p>Đang tải...</p> : (
          <div className="panel-flex">
            {zones.map(z => {
              const hasSlots = slotsByZone[z.id] && slotsByZone[z.id].length > 0;
              const isExpanded = expandedZoneId === z.id;

              return (
                <div key={z.id} className="zone-card">
                  <div className="zone-header">
                    <div>
                      <div className="zone-heading-row">
                        <h3 className="zone-title">{z.zone_name}</h3>
                        <span className="zone-type-badge">{z.vehicle_type}</span>
                      </div>
                      <p className="zone-summary">
                        Sức chứa: {z.total_capacity} | Hiện tại: {z.current_occupancy}
                      </p>
                    </div>

                    {hasSlots && (
                      <button onClick={() => setExpandedZoneId(isExpanded ? null : z.id)} className="secondary zone-action-button">
                        {isExpanded ? 'Đóng Bản đồ Slot' : 'Xem Bản đồ Slot'}
                      </button>
                    )}
                  </div>

                  {isExpanded && hasSlots && (
                    <div className="slot-map-container">
                      <div className="slot-legend">
                        <span className="legend-item"><div className="legend-box empty"></div> Trống (Empty)</span>
                        <span className="legend-item"><div className="legend-box rented"></div> Đã thuê (Khách chưa vào bãi)</span>
                        <span className="legend-item"><div className="legend-box occupied"></div> Đang đỗ (Xe đang trong bãi)</span>
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
                              title={slot.vehicles ? `Khách hàng đã thuê: Biển số ${slot.vehicles.plate}` : 'Trống'}
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
            {zones.length === 0 && <p className="zone-empty-message">Chưa có khu vực nào.</p>}
          </div>
        )}
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
