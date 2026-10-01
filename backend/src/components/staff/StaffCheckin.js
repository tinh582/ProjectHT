import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { plateInput } = req.body;
    if (!plateInput) return res.status(400).json({ logMessage: '❌ Thiếu biển số xe' });
    
    try {
        const { data: vehicles, error: vError } = await supabase.from('vehicles').select('*').eq('plate', plateInput.toUpperCase());
        if (vError || !vehicles || vehicles.length === 0) {
            return res.json({ logMessage: '❌ Không tìm thấy phương tiện với biển số: ' + plateInput });
        }
        
        const vehicle = vehicles[0];
        const { data: zones } = await supabase.from('parking_zones').select('*').eq('vehicle_type', vehicle.type).order('current_occupancy', { ascending: true });
        const targetZone = zones && zones.length > 0 ? zones[0] : null;
        
        const { data: slots } = await supabase.from('parking_slots').select('*, parking_zones(zone_name)').eq('vehicle_id', vehicle.id);
        const mySlot = slots && slots.length > 0 ? slots[0] : null;

        const { data: activeSessions } = await supabase.from('parking_sessions').select('*').eq('vehicle_id', vehicle.id).eq('status', 'active');
        
        if (activeSessions && activeSessions.length > 0) {
            const session = activeSessions[0];
            const { error: updateError } = await supabase.from('parking_sessions').update({ status: 'completed', exit_time: new Date().toISOString() }).eq('id', session.id);
            
            if (!updateError) {
                if (mySlot) {
                    await supabase.from('parking_slots').update({ status: 'rented' }).eq('id', mySlot.id);
                    await supabase.from('parking_zones').update({ current_occupancy: Math.max(0, targetZone ? targetZone.current_occupancy - 1 : 0) }).eq('id', mySlot.zone_id);
                }
                await supabase.from('notifications').insert([{
                    user_id: vehicle.user_id,
                    title: 'Xe đã ra khỏi bãi',
                    message: `Xe ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) đã Check-out lúc ${new Date().toLocaleTimeString()}`
                }]);
                return res.json({ logMessage: `✅ Đã CHECK-OUT thành công: ${vehicle.brand} ${vehicle.model} (${vehicle.plate})` });
            }
            throw updateError;
        } else {
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
                return res.json({ logMessage: `❌ TỪ CHỐI CHECK-IN: Chủ xe ${vehicle.plate} chưa mua thẻ đỗ xe hoặc thẻ đã hết hạn!` });
            }
            if (!mySlot) {
                return res.json({ logMessage: `❌ TỪ CHỐI CHECK-IN: Xe ${vehicle.plate} chưa chọn vị trí đỗ cố định! Yêu cầu khách thao tác trên App.` });
            }

            const { error: insertError } = await supabase.from('parking_sessions').insert([{ vehicle_id: vehicle.id, status: 'active' }]);
            if (!insertError) {
                await supabase.from('parking_slots').update({ status: 'occupied' }).eq('id', mySlot.id);
                const { data: zData } = await supabase.from('parking_zones').select('current_occupancy').eq('id', mySlot.zone_id);
                if (zData && zData.length > 0) {
                    await supabase.from('parking_zones').update({ current_occupancy: zData[0].current_occupancy + 1 }).eq('id', mySlot.zone_id);
                }
                await supabase.from('notifications').insert([{
                    user_id: vehicle.user_id,
                    title: 'Xe đã vào bãi',
                    message: `Xe ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) đã Check-in vào vị trí ${mySlot.slot_name} lúc ${new Date().toLocaleTimeString()}`
                }]);
                return res.json({ logMessage: `✅ Đã CHECK-IN thành công! Hướng dẫn khách đỗ vào vị trí cố định: [ ${mySlot.slot_name} ] - Khu ${mySlot.parking_zones?.zone_name}` });
            }
            throw insertError;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
