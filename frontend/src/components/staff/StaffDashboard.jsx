import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import NotificationMenu from '../user/NotificationMenu';
import StaffCheckin from './StaffCheckin';
import StaffCamera from './StaffCamera';
import StaffExceptions from './StaffExceptions';
import StaffSupport from './StaffSupport';
import StaffSlotMap from './StaffSlotMap';
import {
  classifyStaffNotificationTab,
  computeStaffTabBadges,
  loadSeenSet,
  saveSeenSet
} from '../../lib/tabNotifications';

export default function StaffDashboard({ session, onBackToLanding }) {
  const notifStorageKey = `ht_seen_notifs_${session?.user?.id || 'staff'}`;
  const [activeTab, setActiveTab] = useState('checkin');
  const [notifications, setNotifications] = useState([]);
  const [seenNotifIds, setSeenNotifIds] = useState(() => loadSeenSet(notifStorageKey));
  const [staffStatus, setStaffStatus] = useState({
    loading: true,
    confirmed: true,
    devOtpPreview: '',
    confirmUrl: ''
  });
  const [otpInput, setOtpInput] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmSuccess, setConfirmSuccess] = useState('');
  const [confirming, setConfirming] = useState(false);

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
    checkStaffEmailConfirmation();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unreadInActiveTab = notifications
      .filter(
        (n) =>
          n?.id &&
          !n.is_read &&
          !seenNotifIds.has(String(n.id)) &&
          classifyStaffNotificationTab(n) === activeTab
      )
      .map((n) => String(n.id));

    if (unreadInActiveTab.length > 0) {
      markNotificationsRead(unreadInActiveTab);
    }
  }, [activeTab, notifications]);

  const tabBadges = useMemo(
    () =>
      computeStaffTabBadges({
        notifications,
        seenNotifIds
      }),
    [notifications, seenNotifIds]
  );

  const handleSelectStaffTab = (tab) => {
    setActiveTab(tab);
    const tabNotifIds = notifications
      .filter((n) => n?.id && classifyStaffNotificationTab(n) === tab)
      .map((n) => String(n.id));
    if (tabNotifIds.length > 0) {
      markNotificationsRead(tabNotifIds);
    }
  };

  const checkStaffEmailConfirmation = async () => {
    if (!session?.user?.email && !session?.user?.id) {
      setStaffStatus((s) => ({ ...s, loading: false }));
      return;
    }
    try {
      const q = new URLSearchParams({
        email: session.user.email || '',
        userId: session.user.id || ''
      });
      const res = await apiFetch(`/api/components/Register/staff-status?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const isPending = data.staff_confirmation_status === 'pending' || data.email_verified === false;
        setStaffStatus({
          loading: false,
          confirmed: !isPending,
          devOtpPreview: data.dev_otp_preview || '',
          confirmUrl: data.confirm_url || ''
        });
        if (data.dev_otp_preview) {
          setOtpInput(data.dev_otp_preview);
        }
      } else {
        setStaffStatus((s) => ({ ...s, loading: false }));
      }
    } catch {
      setStaffStatus((s) => ({ ...s, loading: false }));
    }
  };

  const handleConfirmStaffEmail = async (e) => {
    e.preventDefault();
    setConfirmError('');
    setConfirmSuccess('');
    setConfirming(true);
    try {
      const res = await apiFetch('/api/components/Register/confirm-staff', {
        method: 'POST',
        body: JSON.stringify({
          email: session?.user?.email,
          userId: session?.user?.id,
          otp: otpInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirmError(data.error || 'Mã xác nhận không hợp lệ.');
        return;
      }
      setConfirmSuccess(data.message || '✓ Đã xác nhận Email thành công! Tài khoản Nhân viên đã sẵn sàng sử dụng.');
      setTimeout(() => {
        setStaffStatus((s) => ({ ...s, confirmed: true }));
      }, 900);
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleResendStaffOtp = async () => {
    setConfirmError('');
    try {
      const res = await apiFetch('/api/components/Register/resend-staff-confirm', {
        method: 'POST',
        body: JSON.stringify({
          email: session?.user?.email,
          userId: session?.user?.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmSuccess(data.message || 'Đã gửi lại mã xác nhận tới Email của bạn!');
        if (data.devOtpPreview) {
          setStaffStatus((s) => ({ ...s, devOtpPreview: data.devOtpPreview }));
          setOtpInput(data.devOtpPreview);
        }
      } else {
        setConfirmError(data.error || 'Không thể gửi lại mã xác nhận.');
      }
    } catch (err) {
      setConfirmError(err.message);
    }
  };

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      const response = await apiFetch(`/api/components/user/Dashboard/notifications/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Failed fetching staff notifications:', err);
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
        <p className="nav-label">NHÂN VIÊN</p>
        <div className={`nav-item ${activeTab === 'camera' ? 'active' : ''}`} onClick={() => handleSelectStaffTab('camera')}>
          📹 <span>Giám sát Camera</span>
          {tabBadges.camera > 0 && <span className="nav-tab-badge">{tabBadges.camera}</span>}
        </div>
        <div className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => handleSelectStaffTab('map')}>
          🗺️ <span>Sơ đồ bãi đỗ</span>
          {tabBadges.map > 0 && <span className="nav-tab-badge">{tabBadges.map}</span>}
        </div>
        <div className={`nav-item ${activeTab === 'exception' ? 'active' : ''}`} onClick={() => handleSelectStaffTab('exception')}>
          ⚠️ <span>Xử lý lỗi</span>
          {tabBadges.exception > 0 && <span className="nav-tab-badge">{tabBadges.exception}</span>}
        </div>
        <div className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => handleSelectStaffTab('support')}>
          🎧 <span>Hỗ trợ khách hàng</span>
          {tabBadges.support > 0 && <span className="nav-tab-badge">{tabBadges.support}</span>}
        </div>
        <div className={`nav-item ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => handleSelectStaffTab('checkin')}>
          ⏱️ <span>Check in/out</span>
          {tabBadges.checkin > 0 && <span className="nav-tab-badge">{tabBadges.checkin}</span>}
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
          <span>Cổng Nhân viên <b>/ {activeTab}</b></span>
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
          {!staffStatus.loading && !staffStatus.confirmed ? (
            <div
              className="panel"
              style={{
                maxWidth: '560px',
                margin: '32px auto',
                padding: '28px',
                border: '2px solid #f59e0b',
                borderRadius: '14px',
                background: '#ffffff'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', letterSpacing: '0.06em' }}>
                YÊU CẦU XÁC NHẬN EMAIL THẬT CỦA NHÂN VIÊN MỚI
              </div>
              <h2 style={{ margin: '6px 0 10px 0', color: '#0f172a' }}>
                📧 Xác nhận kích hoạt tài khoản Nhân viên sử dụng
              </h2>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
                Quản trị viên (Admin) đã khởi tạo tài khoản Nhân viên cho bạn với địa chỉ Email thật:{' '}
                <b>{session?.user?.email}</b>. Vui lòng kiểm tra hộp thư đến và nhập mã xác nhận 6 chữ số (hoặc nhấn Link trong Email) để xác nhận đưa tài khoản vào sử dụng.
              </p>

              {staffStatus.devOtpPreview && (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1.5px dashed #10b981',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    margin: '14px 0'
                  }}
                >
                  <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>
                    MÃ OTP TRONG HỘP THƯ CỦA BẠN:
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '5px', color: '#065f46' }}>
                    {staffStatus.devOtpPreview}
                  </div>
                </div>
              )}

              {confirmError && <p className="error">{confirmError}</p>}
              {confirmSuccess && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: '#ecfdf5',
                    color: '#047857',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    marginBottom: '12px'
                  }}
                >
                  {confirmSuccess}
                </div>
              )}

              <form onSubmit={handleConfirmStaffEmail} style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                <label style={{ fontWeight: 700, fontSize: '13px' }}>
                  Mã xác nhận 6 chữ số trong Email
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Nhập 6 chữ số..."
                    maxLength={8}
                    required
                    style={{
                      marginTop: '6px',
                      fontSize: '18px',
                      fontWeight: 800,
                      letterSpacing: '4px',
                      textAlign: 'center'
                    }}
                  />
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                  <button type="button" className="secondary" onClick={handleResendStaffOtp}>
                    📩 Gửi lại mã xác nhận
                  </button>
                  <button type="submit" className="primary" disabled={confirming}>
                    {confirming ? 'Đang xác nhận...' : '✓ Xác nhận & Bắt đầu sử dụng tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {activeTab === 'camera' && <StaffCamera />}
              {activeTab === 'map' && <StaffSlotMap />}
              {activeTab === 'exception' && <StaffExceptions />}
              {activeTab === 'support' && <StaffSupport />}
              {activeTab === 'checkin' && <StaffCheckin />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
