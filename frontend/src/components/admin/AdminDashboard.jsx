import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import NotificationMenu from '../user/NotificationMenu';
import AdminPricing from './AdminPricing';
import AdminZones from './AdminZones';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import { classifyAdminNotificationTab, computeAdminTabBadges } from '../../lib/tabNotifications';

export default function AdminDashboard({ session, onBackToLanding }) {
  const [activeTab, setActiveTab] = useState('pricing');
  const [notifications, setNotifications] = useState([]);
  const [seenNotifIds, setSeenNotifIds] = useState(() => new Set());
  const [adminCounts, setAdminCounts] = useState({
    pendingKycCount: 0,
    pendingStaffConfirmCount: 0,
    maintenanceSlotCount: 0,
    pendingTxCount: 0
  });

  useEffect(() => {
    fetchAdminNotificationsAndCounts();
    const timer = setInterval(fetchAdminNotificationsAndCounts, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchAdminNotificationsAndCounts = async () => {
    try {
      const requests = [
        apiFetch('/api/components/admin/AdminUsers?page=1&pageSize=50'),
        apiFetch('/api/components/admin/AdminZones/summary')
      ];
      if (session?.user?.id) {
        requests.push(apiFetch(`/api/components/user/Dashboard/notifications/${session.user.id}`));
      }

      const [usersRes, mapSummaryRes, notifRes] = await Promise.all(requests);

      let pendingKycCount = 0;
      let pendingStaffConfirmCount = 0;
      let maintenanceSlotCount = 0;

      if (usersRes?.ok) {
        const uData = await usersRes.json();
        const items = Array.isArray(uData?.items) ? uData.items : Array.isArray(uData) ? uData : [];
        pendingKycCount = items.filter((u) => u.kyc_status === 'pending').length;
        pendingStaffConfirmCount = items.filter(
          (u) => u.role === 'staff' && (u.staff_confirmation_status === 'pending' || u.email_verified === false)
        ).length;
      }

      if (mapSummaryRes?.ok) {
        const mData = await mapSummaryRes.json();
        maintenanceSlotCount = Number(mData?.summary?.maintenanceSlots || 0);
      }

      if (notifRes?.ok) {
        const nData = await notifRes.json();
        setNotifications(Array.isArray(nData) ? nData : []);
      }

      setAdminCounts((prev) => ({
        ...prev,
        pendingKycCount,
        pendingStaffConfirmCount,
        maintenanceSlotCount
      }));
    } catch {
      // Ignore badge polling error
    }
  };

  const tabBadges = useMemo(
    () =>
      computeAdminTabBadges({
        notifications,
        ...adminCounts,
        seenNotifIds
      }),
    [notifications, adminCounts, seenNotifIds]
  );

  const handleSelectAdminTab = (tab) => {
    setActiveTab(tab);
    setSeenNotifIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => {
        if (classifyAdminNotificationTab(n) === tab && n?.id) {
          next.add(n.id);
        }
      });
      return next;
    });
    fetchAdminNotificationsAndCounts();
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  return (
    <div id="workspace">
      <aside>
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); onBackToLanding?.(); }}>
          HT<span> PARKING</span>
        </a>
        <p className="nav-label">QUẢN TRỊ VIÊN</p>
        <div
          className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => handleSelectAdminTab('map')}
        >
          ▣ <span>Quản lý bãi đỗ</span>
          {tabBadges.map > 0 && <span className="nav-tab-badge">{tabBadges.map}</span>}
        </div>
        <div
          className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleSelectAdminTab('users')}
        >
          👥 <span>Quản lý người dùng</span>
          {tabBadges.users > 0 && <span className="nav-tab-badge">{tabBadges.users}</span>}
        </div>
        <div
          className={`nav-item ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => handleSelectAdminTab('pricing')}
        >
          💰 <span>Thiết lập giá</span>
          {tabBadges.pricing > 0 && <span className="nav-tab-badge">{tabBadges.pricing}</span>}
        </div>
        <div
          className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => handleSelectAdminTab('reports')}
        >
          📊 <span>Báo cáo & Thống kê</span>
          {tabBadges.reports > 0 && <span className="nav-tab-badge">{tabBadges.reports}</span>}
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
          <span>Cổng Admin <b>/ {activeTab}</b></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="text-button"
              onClick={onBackToLanding}
              style={{ fontWeight: 600, color: '#0f172a' }}
              title="Quay lại Trang chủ"
            >
              🏠 Về Trang chủ
            </button>
            <NotificationMenu notifications={notifications} />
            <span id="user-name">{session?.user?.email}</span>
            <button id="logout" className="text-button" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>
        
        <main>
          {activeTab === 'users' && <AdminUsers session={session} />}
          {activeTab === 'map' && <AdminZones />}
          {activeTab === 'pricing' && <AdminPricing />}
          {activeTab === 'reports' && <AdminReports />}
        </main>
      </div>
    </div>
  );
}
