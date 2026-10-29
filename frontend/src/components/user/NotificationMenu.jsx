import React, { useState } from 'react';

export default function NotificationMenu({ notifications = [], onReplyNotification }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="notification-menu">
      <span onClick={() => setIsNotifOpen(!isNotifOpen)} className="notification-toggle" title="Thông báo & Nhắc nhở">
        🔔
      </span>
      {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      {isNotifOpen && (
        <div className="notification-popover" style={{ minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 className="notification-heading" style={{ margin: 0 }}>
              Thông báo & Phản hồi
            </h4>
            {onReplyNotification && (
              <button
                type="button"
                className="text-button"
                style={{ fontSize: '0.76rem', color: '#0f766e', fontWeight: 700 }}
                onClick={() => {
                  setIsNotifOpen(false);
                  onReplyNotification({
                    category: 'GENERAL_FEEDBACK',
                    subject: 'Yêu cầu hỗ trợ từ khách hàng',
                    message: ''
                  });
                }}
              >
                ＋ Gửi câu hỏi
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                Chưa có thông báo mới.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notification-item ${n.is_read ? 'is-read' : 'is-unread'}`}>
                  <b className="notification-title">{n.title}</b>
                  <p className="notification-message">{n.message}</p>
                  {onReplyNotification && (
                    <button
                      type="button"
                      className="text-button"
                      style={{
                        marginTop: '4px',
                        padding: 0,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#2563eb'
                      }}
                      onClick={() => {
                        setIsNotifOpen(false);
                        onReplyNotification({
                          category: 'GENERAL_FEEDBACK',
                          subject: `Phản hồi thông báo: ${n.title}`,
                          message: `Về thông báo "${n.title}" (${n.message}), phản hồi của tôi là: `
                        });
                      }}
                    >
                      💬 Phản hồi lại nhân viên →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
