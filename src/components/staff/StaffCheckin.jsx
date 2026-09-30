import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function StaffCheckin() {
  const [plateInput, setPlateInput] = useState('');
  const [logMessage, setLogMessage] = useState('');

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!plateInput) return;
    
    // Find the vehicle by plate
    const { data: vehicles, error: vError } = await supabase.from('vehicles').select('*').eq('plate', plateInput.toUpperCase());
    
    if (vError || !vehicles || vehicles.length === 0) {
      setLogMessage('❌ Không tìm thấy phương tiện với biển số: ' + plateInput);
      return;
    }
    
    const vehicle = vehicles[0];
    // Find suitable zone for the vehicle type
    const { data: zones } = await supabase.from('parking_zones').select('*').eq('vehicle_type', vehicle.type).order('current_occupancy', { ascending: true });
    const targetZone = zones && zones.length > 0 ? zones[0] : null;
    
    // Find the vehicle's assigned slot
    const { data: slots } = await supabase.from('parking_slots').select('*, parking_zones(zone_name)').eq('vehicle_id', vehicle.id);
    const mySlot = slots && slots.length > 0 ? slots[0] : null;

    // Check if vehicle already has an active session
    const { data: activeSessions } = await supabase.from('parking_sessions').select('*').eq('vehicle_id', vehicle.id).eq('status', 'active');
    
    if (activeSessions && activeSessions.length > 0) {
      // Check OUT
      const session = activeSessions[0];
      const { error: updateError } = await supabase.from('parking_sessions').update({ status: 'completed', exit_time: new Date().toISOString() }).eq('id', session.id);
      
      if (!updateError) {
        if (mySlot) {
          // Free the physical slot but keep it rented
          await supabase.from('parking_slots').update({ status: 'rented' }).eq('id', mySlot.id);
          // Also decrease zone occupancy
          await supabase.from('parking_zones').update({ current_occupancy: Math.max(0, targetZone ? targetZone.current_occupancy - 1 : 0) }).eq('id', mySlot.zone_id);
        }

        await supabase.from('notifications').insert([{
          user_id: vehicle.user_id,
          title: 'Xe đã ra khỏi bãi',
          message: `Xe ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) đã Check-out lúc ${new Date().toLocaleTimeString()}`
        }]);
        setLogMessage(`✅ Đã CHECK-OUT thành công: ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`);
      }
    } else {
      // Check IN
      // Verify subscription first
      const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', vehicle.user_id).eq('status', 'completed').order('created_at', { ascending: false }).limit(1);
      
      let isExpired = true;
      if (txs && txs.length > 0) {
        const purchaseDate = new Date(txs[0].created_at);
        const expiry = new Date(purchaseDate);
        expiry.setDate(expiry.getDate() + 30);
        if (new Date() <= expiry) {
          isExpired = false;
        }
      }

      if (isExpired) {
        setLogMessage(`❌ TỪ CHỐI CHECK-IN: Chủ xe ${vehicle.plate} chưa mua thẻ đỗ xe hoặc thẻ đã hết hạn!`);
        return;
      }

      if (!mySlot) {
        setLogMessage(`❌ TỪ CHỐI CHECK-IN: Xe ${vehicle.plate} chưa chọn vị trí đỗ cố định! Yêu cầu khách thao tác trên App.`);
        return;
      }

      const { error: insertError } = await supabase.from('parking_sessions').insert([{ vehicle_id: vehicle.id, status: 'active' }]);
      if (!insertError) {
        // Mark physical slot as occupied
        await supabase.from('parking_slots').update({ status: 'occupied' }).eq('id', mySlot.id);
        // Increase zone occupancy
        const { data: zData } = await supabase.from('parking_zones').select('current_occupancy').eq('id', mySlot.zone_id);
        if (zData && zData.length > 0) {
           await supabase.from('parking_zones').update({ current_occupancy: zData[0].current_occupancy + 1 }).eq('id', mySlot.zone_id);
        }

        await supabase.from('notifications').insert([{
          user_id: vehicle.user_id,
          title: 'Xe đã vào bãi',
          message: `Xe ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) đã Check-in vào vị trí ${mySlot.slot_name} lúc ${new Date().toLocaleTimeString()}`
        }]);
        setLogMessage(`✅ Đã CHECK-IN thành công! Hướng dẫn khách đỗ vào vị trí cố định: [ ${mySlot.slot_name} ] - Khu ${mySlot.parking_zones?.zone_name}`);
      }
    }
    setPlateInput('');
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TERMINAL</p>
          <h1>Nhập liệu thủ công<span>.</span></h1>
        </div>
      </div>
      
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eaeaea', maxWidth: '600px' }}>
        <p style={{ color: '#666', marginBottom: '20px' }}>Nhập biển số xe (VD: 81-AA12876) để thực hiện check-in hoặc check-out thủ công.</p>
        <form onSubmit={handleManualCheckIn} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={plateInput} 
            onChange={e => setPlateInput(e.target.value)} 
            placeholder="Nhập biển số xe..." 
            style={{ textTransform: 'uppercase', flex: 1 }} 
            required 
          />
          <button type="submit" className="primary">Xác nhận</button>
        </form>
        
        {logMessage && (
          <div style={{ marginTop: '20px', padding: '15px', background: logMessage.includes('❌') ? '#feebeb' : '#edf2e7', color: logMessage.includes('❌') ? '#b33a32' : '#2a5340', borderRadius: '8px', fontWeight: '500' }}>
            {logMessage}
          </div>
        )}
      </div>
    </div>
  );
}
