import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
    const { data: zData } = await supabase.from('parking_zones').select('*').order('created_at', { ascending: true });
    if (zData) setZones(zData);

    const { data: sData } = await supabase.from('parking_slots').select('*, vehicles(plate)');
    if (sData) {
      const grouped = {};
      sData.forEach(s => {
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

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
        <p style={{ color: '#666', marginBottom: '20px' }}>Danh sách các vị trí đỗ cố định. Nhân viên có thể xem trực tiếp để biết vị trí nào đang trống, đã cho thuê, hoặc đang có xe đậu sai quy định.</p>
        
        {loading ? <p>Đang tải...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {zones.map(z => {
              const hasSlots = slotsByZone[z.id] && slotsByZone[z.id].length > 0;
              const isExpanded = expandedZoneId === z.id;
              
              return (
                <div key={z.id} style={{ border: '1px solid #dfe5dc', padding: '15px', borderRadius: '8px', background: '#fcfcfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{z.zone_name}</h3>
                        <span style={{ fontSize: '12px', color: '#666', background: '#eee', padding: '2px 8px', borderRadius: '12px' }}>{z.vehicle_type}</span>
                      </div>
                      <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                        Sức chứa: {z.total_capacity} | Hiện tại: {z.current_occupancy}
                      </p>
                    </div>
                    
                    {hasSlots && (
                      <button onClick={() => setExpandedZoneId(isExpanded ? null : z.id)} className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        {isExpanded ? 'Đóng Bản đồ Slot' : 'Xem Bản đồ Slot'}
                      </button>
                    )}
                  </div>

                  {isExpanded && hasSlots && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eaeaea' }}>
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#fff', border: '1px solid #ccc', borderRadius: '2px' }}></div> Trống (Empty)</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#fef9c3', border: '1px solid #eab308', borderRadius: '2px' }}></div> Đã thuê (Khách chưa vào bãi)</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '2px' }}></div> Đang đỗ (Xe đang trong bãi)</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {slotsByZone[z.id].map(slot => {
                          let bg = '#fff';
                          let border = '#ccc';
                          if (slot.status === 'rented') { bg = '#fef9c3'; border = '#eab308'; }
                          if (slot.status === 'occupied') { bg = '#fee2e2'; border = '#ef4444'; }
                          
                          return (
                            <div 
                              key={slot.id} 
                              onClick={() => setSelectedSlotForInfo(slot)}
                              style={{ 
                                width: '60px', height: '60px', 
                                background: bg, border: `1px solid ${border}`, 
                                borderRadius: '6px', 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.1s'
                              }}
                              title={slot.vehicles ? `Khách hàng đã thuê: Biển số ${slot.vehicles.plate}` : 'Trống'}
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
            {zones.length === 0 && <p style={{ color: '#888' }}>Chưa có khu vực nào.</p>}
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
