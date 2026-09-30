import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import VehicleDialog from './VehicleDialog';
import UserPayment from './UserPayment';
import UserSlotPicker from './UserSlotPicker';
import { Link } from 'react-router-dom';

export default function Dashboard({ session }) {
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicleIds, setActiveVehicleIds] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [slotPickerVehicle, setSlotPickerVehicle] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('vehicles');
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    fetchVehicles();
    fetchNotifications();
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    const { data } = await supabase.from('pricing_configs').select('*').order('price', { ascending: true });
    if (data) setPricingConfigs(data);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setNotifications(data && data.length > 0 ? data : [
      { id: 1, title: 'Khuyến mãi đặc biệt', message: 'Giảm 20% thẻ tháng khi gia hạn trong hôm nay!', is_read: false },
      { id: 2, title: 'Nhắc nhở gia hạn', message: 'Thẻ tháng Ô tô của bạn sẽ hết hạn sau 3 ngày nữa.', is_read: true }
    ]);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, parking_slots(slot_name)')
      .eq('user_id', session.user.id);

    if (error) {
      console.error("Error fetching vehicles:", error);
    } else {
      setVehicles(data || []);
      // Also fetch which vehicles are currently parked
      if (data && data.length > 0) {
        const vIds = data.map(v => v.id);
        const { data: sessions } = await supabase.from('parking_sessions').select('vehicle_id').in('vehicle_id', vIds).eq('status', 'active');
        if (sessions) {
          setActiveVehicleIds(sessions.map(s => s.vehicle_id));
        }
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (!error) {
        fetchVehicles();
      } else {
        alert('Lỗi: ' + error.message);
      }
    }
  };

  const openAddDialog = () => {
    setVehicleToEdit(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (vehicle) => {
    setVehicleToEdit(vehicle);
    setIsDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    
    // Simulate payment delay
    setTimeout(async () => {
      // 1. Save transaction
      await supabase.from('transactions').insert([{
        user_id: session.user.id,
        amount: selectedPlan.price,
        plan_name: selectedPlan.plan_type,
        status: 'completed'
      }]);
      
      // 2. Add notification
      await supabase.from('notifications').insert([{
        user_id: session.user.id,
        title: 'Thanh toán thành công',
        message: `Bạn đã mua thành công gói ${selectedPlan.plan_type} với giá ${selectedPlan.price.toLocaleString()}đ.`,
      }]);
      
      alert('Thanh toán thành công!');
      setIsProcessing(false);
      setSelectedPlan(null);
      fetchNotifications();
    }, 2000);
  };

  return (
    <div id="workspace">
      <aside>
        <a className="logo" href="/">HT<span> PARKING</span></a>
        <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
        <div className={`nav-item ${activeTab === 'vehicles' ? 'active' : ''}`} onClick={() => setActiveTab('vehicles')}>▣ <span>Phương tiện của tôi</span></div>
        <div className={`nav-item ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>💳 <span>Mua thẻ đỗ xe</span></div>
      </aside>

      <div className="main">
        <header>
          <span>Cổng khách hàng <b>/ {activeTab === 'vehicles' ? 'Phương tiện' : 'Thanh toán'}</b></span>
          <div>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <span onClick={() => setIsNotifOpen(!isNotifOpen)} style={{ fontSize: '18px' }}>🔔</span>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
              {isNotifOpen && (
                <div style={{ position: 'absolute', top: '30px', right: 0, width: '300px', background: '#fff', border: '1px solid #eaeaea', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, padding: '15px', color: '#333' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>Thông báo</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ background: n.is_read ? '#f9f9f9' : '#edf2e7', padding: '10px', borderRadius: '6px' }}>
                        <b style={{ display: 'block', fontSize: '12px' }}>{n.title}</b>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span id="user-name">{session.user.email}</span>
            <button id="logout" className="text-button" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>

        <main>
          {activeTab === 'vehicles' && (
            <div>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">QUẢN LÝ PHƯƠNG TIỆN</p>
                  <h1>Phương tiện của tôi<span>.</span></h1>
                </div>
                <button className="primary" onClick={openAddDialog}>＋ Thêm phương tiện</button>
              </div>

              <div className="vehicle-grid">
                {vehicles.map(v => {
                  const isParked = activeVehicleIds.includes(v.id);
                  return (
                    <article key={v.id} className="vehicle-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {v.image && (
                        <img src={v.image} alt={v.model} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                      )}
                      <div className="vehicle-content" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ margin: '0 0 5px' }}>{v.brand} {v.model}</h3>
                            <span className="plate">{v.plate}</span>
                            <p style={{ margin: '5px 0 0' }}>{v.type} - {v.color}</p>
                          </div>
                          {isParked && (
                            <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                              ĐANG ĐỖ TRONG BÃI
                            </span>
                          )}
                        </div>
                        
                        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '6px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#666' }}>Vị trí cố định: </span>
                            {v.parking_slots && v.parking_slots.length > 0 ? (
                              <strong style={{ color: '#2a5340' }}>{v.parking_slots[0].slot_name}</strong>
                            ) : (
                              <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa chọn</span>
                            )}
                          </div>
                          <button 
                            className="secondary" 
                            onClick={() => setSlotPickerVehicle(v)} 
                            disabled={isParked}
                            style={{ padding: '4px 8px', fontSize: '11px', opacity: isParked ? 0.5 : 1, cursor: isParked ? 'not-allowed' : 'pointer' }}
                          >
                            {v.parking_slots && v.parking_slots.length > 0 ? 'Đổi chỗ' : 'Chọn chỗ'}
                          </button>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '12px' }}>
                          <button className="secondary" onClick={() => openEditDialog(v)} disabled={isParked} style={{ padding: '6px 12px', fontSize: '13px', opacity: isParked ? 0.5 : 1, cursor: isParked ? 'not-allowed' : 'pointer' }}>Sửa</button>
                          <button className="secondary" onClick={() => handleDelete(v.id)} disabled={isParked} style={{ padding: '6px 12px', fontSize: '13px', color: isParked ? '#ccc' : '#ff4d4f', borderColor: isParked ? '#ccc' : '#ff4d4f', cursor: isParked ? 'not-allowed' : 'pointer' }}>Xóa</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {isDialogOpen && (
                <VehicleDialog
                  userId={session.user.id}
                  onClose={() => setIsDialogOpen(false)}
                  onSaved={fetchVehicles}
                  vehicleToEdit={vehicleToEdit}
                />
              )}

              {slotPickerVehicle && (
                <UserSlotPicker
                  vehicle={slotPickerVehicle}
                  onClose={() => setSlotPickerVehicle(null)}
                  onSaved={fetchVehicles}
                />
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <UserPayment session={session} fetchNotifications={fetchNotifications} />
          )}
        </main>
      </div>
    </div>
  );
}
