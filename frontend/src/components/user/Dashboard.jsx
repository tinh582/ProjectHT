import VehicleCard from './VehicleCard';
import NotificationMenu from './NotificationMenu';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import VehicleDialog from './VehicleDialog';
import UserPayment from './UserPayment';
import UserSlotPicker from './UserSlotPicker';
import ParkingHistoryDialog from './ParkingHistoryDialog';
import UserProfileDialog from './UserProfileDialog';

export default function Dashboard({ session, onBackToLanding }) {
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicleIds, setActiveVehicleIds] = useState([]);
  const [sessionsByVehicle, setSessionsByVehicle] = useState({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [slotPickerVehicle, setSlotPickerVehicle] = useState(null);
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // All user parking history
  const [allSessions, setAllSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [hasActivePlan, setHasActivePlan] = useState(true);
  const [lockNotice, setLockNotice] = useState(null);

  const parkedVehicleIds = new Set(activeVehicleIds);

  useEffect(() => {
    checkSubscription();
    fetchNotifications();
  }, []);

  const checkSubscription = async () => {
    try {
      const response = await apiFetch(`/api/components/user/UserPayment/subscription/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        const active = Boolean(data?.isActive);
        setHasActivePlan(active);
        if (active) {
          fetchVehicles();
        } else {
          setActiveTab('payment');
        }
      } else {
        setHasActivePlan(false);
        setActiveTab('payment');
      }
    } catch (err) {
      console.error('Failed checking subscription:', err);
      setHasActivePlan(false);
      setActiveTab('payment');
    }
  };

  const fetchNotifications = async () => {
    const response = await apiFetch(`/api/components/user/Dashboard/notifications/${session.user.id}`);
    if (response.ok) {
      const data = await response.json();
      setNotifications(data);
    }
  };

  const fetchVehicles = async () => {
    const response = await apiFetch(`/api/components/user/Dashboard/vehicles/${session.user.id}?withSessions=true`);
    if (response.ok) {
      const data = await response.json();
      setVehicles(data.vehicles || []);
      setActiveVehicleIds(data.activeVehicleIds || []);
      setSessionsByVehicle(data.sessionsByVehicle || {});
    }
  };

  const fetchAllSessions = async () => {
    setLoadingHistory(true);
    try {
      const response = await apiFetch(`/api/components/user/Dashboard/sessions/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setAllSessions(data || []);
      }
    } catch (err) {
      console.error('Failed fetching parking history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  const handleDelete = async (id) => {
    if (!hasActivePlan) {
      alert('Bạn cần có gói cước còn hiệu lực để thực hiện thao tác này.');
      return;
    }
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
    if (!hasActivePlan) {
      setLockNotice('Bạn cần mua gói cước đỗ xe trước khi có thể thêm phương tiện.');
      setActiveTab('payment');
      return;
    }
    setVehicleToEdit(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (vehicle) => {
    if (!hasActivePlan) {
      setLockNotice('Gói cước của bạn đã hết hạn. Vui lòng thanh toán gia hạn trước khi chỉnh sửa phương tiện.');
      setActiveTab('payment');
      return;
    }
    setVehicleToEdit(vehicle);
    setIsDialogOpen(true);
  };

  const handleTabClick = (tab) => {
    if ((tab === 'vehicles' || tab === 'history') && !hasActivePlan) {
      setLockNotice('Khách hàng mới cần thanh toán gói cước trước khi truy cập vào dịch vụ phương tiện và lịch sử đỗ xe.');
      setActiveTab('payment');
      setTimeout(() => setLockNotice(null), 6000);
      return;
    }
    setLockNotice(null);
    setActiveTab(tab);
    if (tab === 'history') {
      fetchAllSessions();
    }
  };

  const formatDateTime = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return ts;
    }
  };

  const calculateDuration = (entry, exit) => {
    if (!entry) return '-';
    const start = new Date(entry).getTime();
    const end = exit ? new Date(exit).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`);

    return parts.join(' ');
  };

  return (
    <div id="workspace">
      <aside>
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); onBackToLanding?.(); }}>
          HT<span> PARKING</span>
        </a>
        <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
        <div
          className={`nav-item ${activeTab === 'vehicles' ? 'active' : ''} ${!hasActivePlan ? 'is-nav-locked' : ''}`}
          onClick={() => handleTabClick('vehicles')}
          title={!hasActivePlan ? 'Yêu cầu thanh toán gói cước để mở khóa' : ''}
        >
          <span>{hasActivePlan ? '▣' : '🔒'}</span>
          <span>Phương tiện của tôi</span>
          {!hasActivePlan && <span className="nav-lock-badge">Khóa</span>}
        </div>
        <div
          className={`nav-item ${activeTab === 'history' ? 'active' : ''} ${!hasActivePlan ? 'is-nav-locked' : ''}`}
          onClick={() => handleTabClick('history')}
          title={!hasActivePlan ? 'Yêu cầu thanh toán gói cước để mở khóa' : ''}
        >
          <span>{hasActivePlan ? '🕒' : '🔒'}</span>
          <span>Lịch sử ra / vào</span>
          {!hasActivePlan && <span className="nav-lock-badge">Khóa</span>}
        </div>
        <div
          className={`nav-item ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => handleTabClick('payment')}
        >
          <span>💳</span> <span>Gia hạn & Đổi gói</span>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div
            className="nav-item"
            onClick={onBackToLanding}
            style={{ cursor: 'pointer', color: '#10b981', fontWeight: 600 }}
          >
            <span>🏠</span> <span>Về Trang chủ</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header>
          <span>Cổng khách hàng <b>/ {activeTab === 'vehicles' ? 'Phương tiện' : activeTab === 'history' ? 'Lịch sử ra/vào' : 'Gia hạn & Đổi gói'}</b></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="text-button"
              onClick={() => setShowProfileDialog(true)}
              style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Hồ sơ & KYC"
            >
              👤 Hồ sơ & KYC
            </button>
            <button
              className="text-button"
              onClick={onBackToLanding}
              style={{ fontWeight: 600, color: '#0f172a' }}
              title="Quay lại Trang chủ"
            >
              🏠 Về Trang chủ
            </button>
            <NotificationMenu notifications={notifications} />
            <span id="user-name">{session.user.email}</span>
            <button id="logout" className="text-button" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>

        <main>
          {lockNotice && (
            <div className="dashboard-gate-alert">
              <span>🔒</span>
              <p>{lockNotice}</p>
              <button type="button" onClick={() => setLockNotice(null)}>✕</button>
            </div>
          )}

          {activeTab === 'vehicles' && (
            hasActivePlan ? (
              <div>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">QUẢN LÝ PHƯƠNG TIỆN</p>
                    <h1>Phương tiện của tôi<span>.</span></h1>
                  </div>
                  <button className="primary" onClick={openAddDialog}>＋ Thêm phương tiện</button>
                </div>

                <div className="vehicle-grid">
                  {vehicles.map(vehicle => {
                    const vehicleSessions = sessionsByVehicle[vehicle.id] || [];
                    const activeSession = vehicleSessions.find(s => s.status === 'active') || null;
                    const latestSession = vehicleSessions[0] || null;

                    return (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        isParked={parkedVehicleIds.has(vehicle.id)}
                        sessionInfo={{ active: activeSession, latest: latestSession }}
                        onSelectSlot={setSlotPickerVehicle}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                        onViewHistory={() => setHistoryVehicle(vehicle)}
                      />
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

                {historyVehicle && (
                  <ParkingHistoryDialog
                    vehicle={historyVehicle}
                    sessions={sessionsByVehicle[historyVehicle.id] || []}
                    onClose={() => setHistoryVehicle(null)}
                  />
                )}
              </div>
            ) : (
              <div className="gated-service-box">
                <span className="gated-lock-icon">🔒</span>
                <h2>Dịch vụ chưa được kích hoạt</h2>
                <p>Khách hàng cần thanh toán một gói cước đỗ xe để kích hoạt tài khoản trước khi có thể quản lý phương tiện hoặc chọn vị trí đỗ.</p>
                <button className="primary" onClick={() => setActiveTab('payment')}>Đi đến Gia hạn & Đổi gói</button>
              </div>
            )
          )}

          {activeTab === 'history' && (
            hasActivePlan ? (
              <div>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">NHẬT KÝ BÃI ĐỖ</p>
                    <h1>Lịch sử xe ra & vào bãi<span>.</span></h1>
                  </div>
                  <button className="secondary" onClick={fetchAllSessions} disabled={loadingHistory}>
                    {loadingHistory ? 'Đang tải...' : '🔄 Làm mới'}
                  </button>
                </div>

                <div className="panel">
                  <p className="users-description">
                    Theo dõi thời gian bắt đầu vào đỗ và rời khỏi bãi xe của tất cả các phương tiện thuộc sở hữu của bạn.
                  </p>

                  {loadingHistory ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Đang tải lịch sử...</div>
                  ) : allSessions.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🚗</span>
                      Chưa có phiên ra/vào nào được ghi nhận cho các xe của bạn.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Phương tiện</th>
                          <th>Biển số</th>
                          <th>Loại xe</th>
                          <th>Thời gian vào bãi</th>
                          <th>Thời gian ra bãi</th>
                          <th>Thời lượng đỗ</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSessions.map(s => {
                          const isActive = s.status === 'active';
                          return (
                            <tr key={s.id}>
                              <td><strong>{s.vehicle?.brand} {s.vehicle?.model}</strong></td>
                              <td><span className="plate">{s.vehicle?.plate || '-'}</span></td>
                              <td>{s.vehicle?.type || '-'}</td>
                              <td><strong className="history-time-text">{formatDateTime(s.entry_time)}</strong></td>
                              <td>
                                {isActive ? (
                                  <span className="history-ongoing">Đang trong bãi</span>
                                ) : (
                                  <strong className="history-time-text">{formatDateTime(s.exit_time)}</strong>
                                )}
                              </td>
                              <td><span className="history-duration">{calculateDuration(s.entry_time, s.exit_time)}</span></td>
                              <td>
                                {isActive ? (
                                  <span className="history-badge-active">
                                    <span className="parked-pulse-dot"></span> Đang đỗ
                                  </span>
                                ) : (
                                  <span className="history-badge-completed">Đã rời bãi</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="gated-service-box">
                <span className="gated-lock-icon">🔒</span>
                <h2>Dịch vụ chưa được kích hoạt</h2>
                <p>Khách hàng cần thanh toán một gói cước đỗ xe để kích hoạt tài khoản trước khi có thể xem lịch sử đỗ xe.</p>
                <button className="primary" onClick={() => setActiveTab('payment')}>Đi đến Gia hạn & Đổi gói</button>
              </div>
            )
          )}

          {activeTab === 'payment' && (
            <UserPayment
              session={session}
              fetchNotifications={fetchNotifications}
              onSubscriptionChange={(data) => {
                const active = Boolean(data?.isActive);
                if (active !== hasActivePlan) {
                  setHasActivePlan(active);
                  if (active) fetchVehicles();
                }
              }}
            />
          )}

          {showProfileDialog && (
            <UserProfileDialog
              session={session}
              onClose={() => setShowProfileDialog(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
