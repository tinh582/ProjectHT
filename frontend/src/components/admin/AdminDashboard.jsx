import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import NotificationMenu from '../user/NotificationMenu';
import AdminPricing from './AdminPricing';
import AdminZones from './AdminZones';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import {
  classifyAdminNotificationTab,
  computeAdminTabBadges,
  loadSeenSet,
  saveSeenSet
} from '../../lib/tabNotifications';

export default function AdminDashboard({ session, onBackToLanding }) {
  const notifStorageKey = `ht_seen_notifs_${session?.user?.id || 'admin'}`;
  const [activeTab, setActiveTab] = useState('pricing');
  const [notifications, setNotifications] = useState([]);
  const [seenNotifIds, setSeenNotifIds] = useState(() => loadSeenSet(notifStorageKey));

  const markNotificationsRead = async (idsToMark = null) => {
    const targetIds = Array.isArray(idsToMark)
      ? idsToMark.filter(Boolean).map(String)
      : notifications.filter((n) => n?.id && !n.is_read).map((n) => String(n.id));

    if (targetIds.length === 0) return;

    setSeenNotifIds((prev) => {
      const next = new Set(prev);
      targetIds.forEach((id) => next.add(id));
      saveSeenSet(notifStorageKey, next);
      return next;
    });

    const idSet = new Set(targetIds);
    setNotifications((prev) =>
      prev.map((n) => (idSet.has(String(n?.id)) ? { ...n, is_read: true } : n))
    );

    if (session?.user?.id) {
      try {
        await apiFetch(`/api/components/user/Dashboard/notifications/${session.user.id}/read-all`, {
          method: 'PUT',
          body: JSON.stringify(Array.isArray(idsToMark) ? { ids: targetIds } : {})
        });
      } catch {
        // Ignore network failure since localStorage already persisted seen state
      }
    }
  };

  useEffect(() => {
    fetchAdminNotifications();
    const timer = setInterval(fetchAdminNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unreadInActiveTab = notifications
      .filter(
        (n) =>
          n?.id &&
          !n.is_read &&
          !seenNotifIds.has(String(n.id)) &&
          classifyAdminNotificationTab(n) === activeTab
      )
      .map((n) => String(n.id));

    if (unreadInActiveTab.length > 0) {
      markNotificationsRead(unreadInActiveTab);
    }
  }, [activeTab, notifications]);

  const fetchAdminNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      const notifRes = await apiFetch(`/api/components/user/Dashboard/notifications/${session.user.id}`);
      if (notifRes?.ok) {
        const nData = await notifRes.json();
        setNotifications(Array.isArray(nData) ? nData : []);
      }
    } catch {
      // Ignore badge polling error
    }
  };

  const tabBadges = useMemo(
    () =>
      computeAdminTabBadges({
        notifications,
        seenNotifIds
      }),
    [notifications, seenNotifIds]
  );

  const handleSelectAdminTab = (tab) => {
    setActiveTab(tab);
    const tabNotifIds = notifications
      .filter((n) => n?.id && classifyAdminNotificationTab(n) === tab)
      .map((n) => String(n.id));
    if (tabNotifIds.length > 0) {
      markNotificationsRead(tabNotifIds);
    }
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
            <NotificationMenu
              notifications={notifications}
              seenNotifIds={seenNotifIds}
              onMarkAllRead={() => markNotificationsRead(null)}
            />
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
