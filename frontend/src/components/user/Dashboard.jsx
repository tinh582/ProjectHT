import VehicleCard from './VehicleCard';
import NotificationMenu from './NotificationMenu';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import VehicleDialog from './VehicleDialog';
import UserPayment from './UserPayment';
import UserSlotPicker from './UserSlotPicker';

export default function Dashboard({ session }) {
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicleIds, setActiveVehicleIds] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [slotPickerVehicle, setSlotPickerVehicle] = useState(null);

  const [notifications, setNotifications] = useState([]);

  const [activeTab, setActiveTab] = useState('vehicles');
  const parkedVehicleIds = new Set(activeVehicleIds);

  useEffect(() => {
    fetchVehicles();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const response = await apiFetch(`/api/components/user/Dashboard/notifications/${session.user.id}`);
    if (response.ok) {
      const data = await response.json();
      setNotifications(data);
    }
  };

  const fetchVehicles = async () => {
    const response = await apiFetch(`/api/components/user/Dashboard/vehicles/${session.user.id}`);
    if (response.ok) {
      const data = await response.json();
      setVehicles(data.vehicles || []);
      setActiveVehicleIds(data.activeVehicleIds || []);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) {
      const response = await apiFetch(`/api/components/user/Dashboard/vehicles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchVehicles();
      } else {
        alert('Lỗi khi xóa phương tiện');
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
            <NotificationMenu notifications={notifications} />
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
                {vehicles.map(vehicle => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} isParked={parkedVehicleIds.has(vehicle.id)}
                    onSelectSlot={setSlotPickerVehicle} onEdit={openEditDialog} onDelete={handleDelete} />
                ))}
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
