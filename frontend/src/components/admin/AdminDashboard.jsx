import React, { useState } from 'react';
import AdminPricing from './AdminPricing';
import AdminZones from './AdminZones';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';

export default function AdminDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('pricing');

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  return (
    <div id="workspace">
      <aside>
        <a className="logo" href="/">HT<span> PARKING</span></a>
        <p className="nav-label">QUẢN TRỊ VIÊN</p>
        <div className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>▣ <span>Quản lý bãi đỗ</span></div>
        <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 <span>Quản lý người dùng</span></div>
        <div className={`nav-item ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>💰 <span>Thiết lập giá</span></div>
        <div className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>📊 <span>Báo cáo & Thống kê</span></div>
      </aside>
      
      <div className="main">
        <header>
          <span>Cổng Admin <b>/ {activeTab}</b></span>
          <div>
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
