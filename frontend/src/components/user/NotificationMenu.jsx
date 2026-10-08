import React, { useState } from 'react';

export default function NotificationMenu({ notifications }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(notification => !notification.is_read).length;
  return (
    <div className="notification-menu">
      <span onClick={() => setIsNotifOpen(!isNotifOpen)} className="notification-toggle">🔔</span>
      {unreadCount > 0 && (
        <span className="notification-count">
          {unreadCount}
        </span>
      )}
      {isNotifOpen && (
        <div className="notification-popover">
          <h4 className="notification-heading">Thông báo</h4>
          <div className="notification-list">
            {notifications.map(n => (
              <div key={n.id} className={`notification-item ${n.is_read ? 'is-read' : 'is-unread'}`}>
                <b className="notification-title">{n.title}</b>
                <p className="notification-message">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
