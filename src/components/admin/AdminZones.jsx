import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
    const { data, error } = await supabase.from('parking_zones').select('*').order('created_at', { ascending: true });
    if (!error) setZones(data || []);
  };

  const fetchSlots = async () => {
    const { data, error } = await supabase.from('parking_slots').select('*, vehicles(plate)');
    if (!error && data) {
      const grouped = {};
      data.forEach(s => {
        if (!grouped[s.zone_id]) grouped[s.zone_id] = [];
        grouped[s.zone_id].push(s);
      });
      
      // Sort slots by name naturally
      Object.keys(grouped).forEach(k => {
        grouped[k].sort((a, b) => {
          const numA = parseInt(a.slot_name.split('-')[1]) || 0;
          const numB = parseInt(b.slot_name.split('-')[1]) || 0;
          return numA - numB;
        });
      });
      setSlotsByZone(grouped);
    }
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneName || !newZoneCapacity) return;
    const capacity = parseInt(newZoneCapacity);
    
    // Insert zone
    const { data: newZone, error } = await supabase.from('parking_zones').insert([{ 
      zone_name: newZoneName, 
      vehicle_type: newZoneType,
      total_capacity: capacity
    }]).select();

    if (!error && newZone && newZone.length > 0) {
      // Auto-generate slots
      const zoneId = newZone[0].id;
      const prefix = newZoneName.split(' ')[0] || 'A';
      const slotsToInsert = [];
      for (let i = 1; i <= capacity; i++) {
        slotsToInsert.push({ zone_id: zoneId, slot_name: `${prefix}-${i}` });
      }
      await supabase.from('parking_slots').insert(slotsToInsert);
      
      setNewZoneName('');
      setNewZoneCapacity('');
      fetchZones();
      fetchSlots();
    }
  };

  const handleDeleteZone = async (id) => {
    if(window.confirm('Xóa khu vực này sẽ xóa toàn bộ danh sách Slot bên trong. Tiếp tục?')) {
      const { error } = await supabase.from('parking_zones').delete().eq('id', id);
      if (!error) {
        fetchZones();
        fetchSlots();
      }
    }
  };

  const generateMissingSlots = async (zone) => {
    if(window.confirm(`Tạo ${zone.total_capacity} vị trí đỗ cho ${zone.zone_name}?`)) {
      const prefix = zone.zone_name.split(' ')[0] || 'Z';
      const slotsToInsert = [];
      for (let i = 1; i <= zone.total_capacity; i++) {
        slotsToInsert.push({ zone_id: zone.id, slot_name: `${prefix}-${i}` });
      }
      await supabase.from('parking_slots').insert(slotsToInsert);
      fetchSlots();
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
          <button type="submit" className="primary" style={{ marginBottom: '8px' }}>Thêm</button>
        </form>

        <div className="panel-flex">
          {zones.map(z => {
            const hasSlots = slotsByZone[z.id] && slotsByZone[z.id].length > 0;
            const isExpanded = expandedZoneId === z.id;
            
            return (
              <div key={z.id} className="zone-card">
                <div className="zone-header">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <h3 className="zone-title">{z.zone_name}</h3>
                      <span className="zone-type-badge">{z.vehicle_type}</span>
                    </div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                      Sức chứa: {z.total_capacity} | Hiện tại: {z.current_occupancy}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {!hasSlots ? (
                      <button onClick={() => generateMissingSlots(z)} className="primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Tạo danh sách Slot</button>
                    ) : (
                      <button onClick={() => setExpandedZoneId(isExpanded ? null : z.id)} className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        {isExpanded ? 'Đóng Bản đồ Slot' : 'Xem Bản đồ Slot'}
                      </button>
                    )}
                    <button onClick={() => handleDeleteZone(z.id)} className="secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'red', borderColor: '#ff4d4f' }}>Xóa Khu vực</button>
                  </div>
                </div>

                {isExpanded && hasSlots && (
                  <div className="slot-map-container">
                    <h4 style={{ margin: '0 0 15px', fontSize: '14px' }}>Bản đồ Vị trí đỗ ({slotsByZone[z.id].length} vị trí)</h4>
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
                            <b style={{ fontSize: '13px' }}>{slot.slot_name}</b>
                            {slot.vehicles && <span style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{slot.vehicles.plate}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {zones.length === 0 && <p style={{ color: '#888' }}>Chưa có khu vực nào được thiết lập.</p>}
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
