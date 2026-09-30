import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import StaffCheckin from './StaffCheckin';
import StaffCamera from './StaffCamera';
import StaffExceptions from './StaffExceptions';
import StaffSupport from './StaffSupport';
import StaffSlotMap from './StaffSlotMap';

export default function StaffDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('checkin');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div id="workspace">
      <aside>
        <a className="logo" href="/">HT<span> PARKING</span></a>
        <p className="nav-label">NHÂN VIÊN</p>
        <div className={`nav-item ${activeTab === 'camera' ? 'active' : ''}`} onClick={() => setActiveTab('camera')}>📹 <span>Giám sát Camera</span></div>
        <div className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>🗺️ <span>Sơ đồ bãi đỗ</span></div>
        <div className={`nav-item ${activeTab === 'exception' ? 'active' : ''}`} onClick={() => setActiveTab('exception')}>⚠️ <span>Xử lý ngoại lệ</span></div>
        <div className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>🎧 <span>Hỗ trợ khách hàng</span></div>
        <div className={`nav-item ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => setActiveTab('checkin')}>⏱️ <span>Check in/out</span></div>
      </aside>
      
      <div className="main">
        <header>
          <span>Cổng Nhân viên <b>/ {activeTab}</b></span>
          <div>
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
