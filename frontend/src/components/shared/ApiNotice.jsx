import React, { useEffect, useState } from 'react';

export default function ApiNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const showError = event => setMessage(event.detail);
    window.addEventListener('api-error', showError);
    return () => window.removeEventListener('api-error', showError);
  }, []);
  if (!message) return null;
  return <div className="api-notice" role="alert">
    <span>{message}</span>
    <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">×</button>
  </div>;
}
