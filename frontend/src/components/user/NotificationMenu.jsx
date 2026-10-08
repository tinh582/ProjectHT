import React, { useState } from 'react';

export default function NotificationMenu({ notifications }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(notification => !notification.is_read).length;
  return (
    <div style={{ position: 'relative', cursor: 'pointer' }}>
      <span onClick={() => setIsNotifOpen(!isNotifOpen)} style={{ fontSize: '18px' }}>🔔</span>
      {unreadCount > 0 && (
        <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {unreadCount}
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
  );
}
