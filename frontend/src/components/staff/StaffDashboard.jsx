import React, { useState } from 'react';
import StaffCheckin from './StaffCheckin';
import StaffCamera from './StaffCamera';
import StaffExceptions from './StaffExceptions';
import StaffSupport from './StaffSupport';
import StaffSlotMap from './StaffSlotMap';

export default function StaffDashboard({ session, onBackToLanding }) {
  const [activeTab, setActiveTab] = useState('checkin');

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
        <div className={`nav-item ${activeTab === 'camera' ? 'active' : ''}`} onClick={() => setActiveTab('camera')}>📹 <span>Giám sát Camera</span></div>
        <div className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>🗺️ <span>Sơ đồ bãi đỗ</span></div>
        <div className={`nav-item ${activeTab === 'exception' ? 'active' : ''}`} onClick={() => setActiveTab('exception')}>⚠️ <span>Xử lý ngoại lệ</span></div>
        <div className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>🎧 <span>Hỗ trợ khách hàng</span></div>
        <div className={`nav-item ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => setActiveTab('checkin')}>⏱️ <span>Check in/out</span></div>
        
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
            <span id="user-name">{session?.user?.email}</span>
            <button id="logout" className="text-button" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>
        
        <main>
          {activeTab === 'camera' && <StaffCamera />}
          {activeTab === 'map' && <StaffSlotMap />}
          {activeTab === 'exception' && <StaffExceptions />}
          {activeTab === 'support' && <StaffSupport />}
          {activeTab === 'checkin' && <StaffCheckin />}
        </main>
      </div>
    </div>
  );
}
