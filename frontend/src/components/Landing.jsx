import React, { useState } from 'react';
import './Landing.css';

export default function Landing({
  session,
  role,
  onSwitchToLogin,
  onSwitchToRegister,
  onGoToDashboard,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [simGate, setSimGate] = useState('entry'); // 'entry' | 'exit'
  const [selectedFloor, setSelectedFloor] = useState('B1'); // 'B1' | 'B2'
  const [selectedSlot, setSelectedSlot] = useState('A05');

  const menuItems = [
    {
      id: 'overview',
      menuTitle: 'Tổng quan hệ thống',
      badge: 'Giải pháp đỗ xe thông minh thế hệ mới',
      headline: 'Đỗ xe tự động, ra vào thông suốt không cần quẹt thẻ',
      description: 'Hệ thống ứng dụng camera AI nhận diện biển số phương tiện tức thì trong 1.2 giây, tích hợp bản đồ ô trống thời gian thực và thanh toán VietQR một chạm. Mang đến trải nghiệm gửi xe văn minh, nhanh chóng cho cư dân và người đi làm.',
      highlights: [
        { label: 'Tốc độ nâng barie', value: '1.2s' },
        { label: 'Độ chính xác AI', value: '99.8%' },
        { label: 'Thao tác thẻ vật lý', value: '0 chạm' },
        { label: 'An ninh giám sát', value: '24/7' }
      ]
    },
    {
      id: 'ai-plate',
      menuTitle: 'Nhận diện biển số AI',
      badge: 'Công nghệ thị giác máy tính Roboflow AI',
      headline: 'Lưu thông siêu tốc, bảo vệ phương tiện bằng mã biển số',
      description: 'Camera nhận diện thông minh bắt trọn biển số xe máy và ô tô từ khoảng cách 3-5m với độ chính xác 99.8%. Hoạt động tin cậy trong mọi điều kiện thiếu sáng hầm xe, trời mưa gió hay góc nghiêng phức tạp.',
      highlights: [
        { label: 'Khoảng cách nhận diện', value: '3 - 5m' },
        { label: 'Tốc độ xử lý hình ảnh', value: '60 FPS' },
        { label: 'Tỷ lệ nhận diện chuẩn', value: '99.82%' },
        { label: 'Thời gian dừng chờ', value: '0 giây' }
      ]
    },
    {
      id: 'parking-map',
      menuTitle: 'Sơ đồ bãi & Ô đỗ',
      badge: 'Bản đồ số ô đỗ theo thời gian thực',
      headline: 'Tra cứu chỗ trống trực quan, chủ động giữ vị trí thuận tiện',
      description: 'Xóa bỏ hoàn toàn nỗi lo lái xe lòng vòng tìm chỗ đỗ trong giờ cao điểm. Hệ thống hiển thị chi tiết sơ đồ từng ô đỗ tại các tầng hầm, cho phép người dùng kiểm tra trạng thái và chọn vị trí gần thang máy trước khi đến.',
      highlights: [
        { label: 'Cập nhật trạng thái', value: 'Thời gian thực' },
        { label: 'Phân luồng làn đỗ', value: 'Chuẩn 3.5m' },
        { label: 'Số tầng hầm quản lý', value: 'Hầm B1 - B2' },
        { label: 'Tổng sức chứa', value: '500+ Xe' }
      ]
    },
    {
      id: 'pricing',
      menuTitle: 'Bảng giá & Vé tháng',
      badge: 'Chính sách giá minh bạch & Thanh toán VietQR',
      headline: 'Đăng ký vé tháng trực tuyến, tiết kiệm tới 35% chi phí',
      description: 'Cung cấp các gói vé tháng linh hoạt dành cho cư dân tòa nhà và nhân viên văn phòng. Quét mã VietQR tự động qua mọi ứng dụng ngân hàng, nhận xác nhận kích hoạt thẻ ngay sau vài giây.',
      highlights: [
        { label: 'Vé tháng xe máy', value: '400.000đ' },
        { label: 'Vé tháng ô tô', value: '900.000đ' },
        { label: 'Phương thức thanh toán', value: 'VietQR / Napas' },
        { label: 'Tiết kiệm so với lượt', value: 'Đến 35%' }
      ]
    },
    {
      id: 'security',
      menuTitle: 'An ninh & PCCC',
      badge: 'Tiêu chuẩn bảo vệ đa tầng 24/7',
      headline: 'Hệ thống an ninh khép kín, an tâm tuyệt đối cho tài sản',
      description: 'Bãi đỗ được trang bị mạng lưới camera giám sát độ nét cao phủ kín 100% các góc khuất, hệ thống PCCC tự động đạt chuẩn kiểm định và đội ngũ tuần tra an ninh thường trực ngày đêm.',
      highlights: [
        { label: 'Phạm vi camera', value: '100% diện tích' },
        { label: 'Chu kỳ tuần tra', value: '30 phút/lần' },
        { label: 'Hệ thống chữa cháy', value: 'Sprinkler tự động' },
        { label: 'Bảo hiểm bãi xe', value: 'Bảo vệ toàn diện' }
      ]
    },
    {
      id: 'support',
      menuTitle: 'Tiện ích & Cứu hộ',
      badge: 'Dịch vụ gia tăng chu đáo cho tài xế',
      headline: 'Đồng hành và hỗ trợ xử lý sự cố phương tiện tại chỗ',
      description: 'HT Parking luôn chuẩn bị sẵn sàng thiết bị hỗ trợ miễn phí cho khách hàng: trạm bơm lốp tự động, bộ kích bình ắc quy dự phòng và nhân viên hỗ trợ xi-nhan hướng dẫn đỗ xe an toàn.',
      highlights: [
        { label: 'Hotline trực ban', value: '1900 6868' },
        { label: 'Kích bình ắc quy', value: 'Miễn phí' },
        { label: 'Trạm bơm lốp điện tử', value: 'Miễn phí' },
        { label: 'Thời gian hỗ trợ', value: '24/7' }
      ]
    }
  ];

  const current = menuItems[activeTab];

  // Demo slots for Tab 2 (Parking Map)
  const slotsB1 = [
    { id: 'A01', type: 'car', status: 'occupied', plate: '30G-123.45' },
    { id: 'A02', type: 'car', status: 'occupied', plate: '29A-688.86' },
    { id: 'A03', type: 'car', status: 'available' },
    { id: 'A04', type: 'car', status: 'occupied', plate: '51F-999.99' },
    { id: 'A05', type: 'car', status: 'selected' },
    { id: 'A06', type: 'car', status: 'available' },
    { id: 'A07', type: 'car', status: 'occupied', plate: '30E-456.78' },
    { id: 'A08', type: 'car', status: 'available' },
    { id: 'A09', type: 'car', status: 'available' },
    { id: 'A10', type: 'car', status: 'occupied', plate: '29D-777.77' },
    { id: 'A11', type: 'car', status: 'available' },
    { id: 'A12', type: 'car', status: 'occupied', plate: '30A-888.88' },
  ];

  return (
    <div className="ht-layout">
      {/* ============================================================ */}
      {/* 1. LEFT NAVIGATION SIDEBAR (Clean Commercial Style)         */}
      {/* ============================================================ */}
      <aside className="ht-sidebar">
        {/* Brand Header */}
        <div className="ht-brand-box">
          <div className="ht-brand-logo">
            <span className="logo-ht">HT</span>
            <span className="logo-parking">PARKING</span>
          </div>
          <div className="ht-brand-tag">Bãi đỗ xe thông minh</div>
          <div className="ht-live-badge">
            <span className="live-pulse"></span>
            <span>Bãi xe đang mở cửa 24/7</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="ht-nav-menu" role="tablist">
          {menuItems.map((item, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                id={`ht-tab-${item.id}`}
                className={`ht-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                <span className="nav-item-icon">
                  {idx === 0 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  )}
                  {idx === 1 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  )}
                  {idx === 2 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  )}
                  {idx === 3 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  )}
                  {idx === 4 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  )}
                  {idx === 5 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  )}
                </span>
                <span className="nav-item-label">{item.menuTitle}</span>
              </button>
            );
          })}

          {session && (
            <button
              className="ht-nav-item ht-nav-dashboard"
              onClick={onGoToDashboard}
              id="sidebar-dashboard-btn"
            >
              <span className="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              </span>
              <span className="nav-item-label">Bảng điều khiển của bạn</span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="ht-sidebar-footer">
          <div className="hotline-box">
            <div className="hotline-title">Tổng đài hỗ trợ 24/7</div>
            <a href="tel:19006868" className="hotline-number">1900 6868</a>
          </div>
          <div className="location-info">
            Tòa nhà HT Tower, Hầm B1 - B2
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE / CONTENT AREA                             */}
      {/* ============================================================ */}
      <div className="ht-main-stage">
        {/* Topbar */}
        <header className="ht-topbar">
          <div className="topbar-breadcrumb">
            <span className="crumb-main">Hệ thống Quản lý Bãi đỗ xe HT Parking</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-sub">{current.menuTitle}</span>
          </div>

          <div className="topbar-user-section">
            {session ? (
              <div className="user-profile-bar">
                <div className="user-badge-info">
                  <span className="user-avatar-circle">
                    {session.user.email ? session.user.email.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <div className="user-text-info">
                    <span className="user-email-text">{session.user.email}</span>
                    <span className="user-role-pill">
                      {role === 'admin' ? 'Quản trị viên' : role === 'staff' ? 'Nhân viên' : 'Khách hàng'}
                    </span>
                  </div>
                </div>

                <button
                  className="ht-btn-solid"
                  onClick={onGoToDashboard}
                  id="topbar-dashboard-btn"
                >
                  Vào Bảng điều khiển →
                </button>

                <button
                  className="ht-btn-ghost"
                  onClick={onLogout}
                  id="topbar-logout-btn"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="guest-action-bar">
                <button
                  className="ht-btn-outline"
                  onClick={onSwitchToLogin}
                  id="topbar-login-btn"
                >
                  Đăng nhập
                </button>
                <button
                  className="ht-btn-solid"
                  onClick={onSwitchToRegister}
                  id="topbar-register-btn"
                >
                  Đăng ký vé tháng
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Main Workspace Stage */}
        <main className="ht-workspace-body" key={current.id}>
          {/* Header of Active Section */}
          <section className="hero-section">
            <div className="hero-badge-tag">{current.badge}</div>
            <h1 className="hero-heading">{current.headline}</h1>
            <p className="hero-desc">{current.description}</p>

            {/* Quick Metrics Strip */}
            <div className="hero-metrics-strip">
              {current.highlights.map((m, idx) => (
                <div key={idx} className="metric-box">
                  <div className="metric-val">{m.value}</div>
                  <div className="metric-lbl">{m.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Tab Specific Content Panels */}
          <div className="content-panel-grid">
            {/* ======================================================== */}
            {/* TAB 0: TỔNG QUAN (HOME / OVERVIEW)                       */}
            {/* ======================================================== */}
            {activeTab === 0 && (
              <>
                {/* Left column: Key Benefits */}
                <div className="panel-card">
                  <h3 className="panel-title">Lợi ích vượt trội cho khách hàng</h3>
                  
                  <div className="benefits-list">
                    <div className="benefit-item">
                      <div className="benefit-icon bg-emerald">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Tiết kiệm 5 - 10 phút mỗi ngày</h4>
                        <p>Không cần dừng xe hạ kính quẹt thẻ từ, loại bỏ hoàn toàn cảnh xếp hàng ùn tắc tại cổng vào giờ cao điểm.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Biết trước chỗ trống trước khi xuất phát</h4>
                        <p>Tra cứu số lượng ô trống theo từng khu vực hầm A và hầm B, chủ động chọn vị trí gần thang máy tiện lợi.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-amber">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Tiết kiệm đến 35% với vé tháng</h4>
                        <p>Chính sách giá vé tháng ưu đãi cố định cho cư dân và nhân viên, thanh toán quét mã VietQR tự động.</p>
                      </div>
                    </div>
                  </div>

                  <div className="cta-action-group">
                    {session ? (
                      <button className="ht-btn-solid" onClick={onGoToDashboard}>
                        Vào Bảng điều khiển quản lý xe →
                      </button>
                    ) : (
                      <button className="ht-btn-solid" onClick={onSwitchToRegister}>
                        Đăng ký trải nghiệm ngay →
                      </button>
                    )}
                    <button className="ht-btn-outline" onClick={() => setActiveTab(3)}>
                      Xem bảng giá chi tiết
                    </button>
                  </div>
                </div>

                {/* Right column: Real Smart Gate Preview */}
                <div className="panel-card panel-gate-showcase">
                  <div className="gate-image-container">
                    <img
                      src="/smart_parking_gate.jpg"
                      alt="Cổng bãi đỗ xe thông minh HT Parking"
                      className="gate-image"
                    />
                    <div className="gate-status-pill">
                      <span className="live-pulse"></span>
                      <span>Làn vào #01 • Hoạt động bình thường</span>
                    </div>
                  </div>

                  <div className="gate-telemetry-box">
                    <div className="gate-toggle-tabs">
                      <button
                        className={`gate-tab ${simGate === 'entry' ? 'active' : ''}`}
                        onClick={() => setSimGate('entry')}
                      >
                        Làn xe vào
                      </button>
                      <button
                        className={`gate-tab ${simGate === 'exit' ? 'active' : ''}`}
                        onClick={() => setSimGate('exit')}
                      >
                        Làn xe ra
                      </button>
                    </div>

                    <div className="vehicle-scan-result">
                      <div className="plate-badge-vietnam">
                        <span className="flag-dot"></span>
                        <span className="plate-text">
                          {simGate === 'entry' ? '30G - 688.86' : '29A - 999.99'}
                        </span>
                      </div>
                      <div className="plate-meta-info">
                        <div className="meta-row">
                          <span className="meta-k">Phương tiện:</span>
                          <span className="meta-v"><b>{simGate === 'entry' ? 'Mazda CX-5 (Trắng)' : 'Honda SH 150i (Đen)'}</b></span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-k">Trạng thái thẻ:</span>
                          <span className="meta-v text-emerald">● Vé tháng hợp lệ</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-k">Barie tự động:</span>
                          <span className="meta-v text-emerald">🟢 Đang mở • Xin mời qua</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 1: NHẬN DIỆN BIỂN SỐ AI                             */}
            {/* ======================================================== */}
            {activeTab === 1 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Quy trình nhận diện AI 3 bước</h3>
                  <div className="workflow-steps">
                    <div className="step-card">
                      <div className="step-num">01</div>
                      <div className="step-content">
                        <h4>Camera AI tự động phát hiện phương tiện</h4>
                        <p>Cảm biến quang học quét khi xe tiến đến vị trí cách barie 3 - 5m, tự động kích hoạt chế độ chụp tốc độ cao.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">02</div>
                      <div className="step-content">
                        <h4>Trích xuất và đối soát biển số trong 0.2s</h4>
                        <p>Mô hình AI Roboflow phân tích ký tự biển số, loại xe và màu xe với tỷ lệ chính xác cao trên 99.8%.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">03</div>
                      <div className="step-content">
                        <h4>Tự động nâng cần barie không cần dừng xe</h4>
                        <p>Hệ thống mở barie trong 1.2s, ghi nhận phiên đỗ xe và gửi thông báo trực tiếp đến điện thoại người dùng.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">So sánh với thẻ từ truyền thống</h3>
                  <div className="comparison-table">
                    <div className="comp-row comp-header">
                      <span>Tiêu chí</span>
                      <span>Thẻ từ cũ</span>
                      <span className="highlight-col">HT Parking AI</span>
                    </div>
                    <div className="comp-row">
                      <span>Thời gian qua trạm</span>
                      <span className="text-muted">15 - 30 giây</span>
                      <span className="text-emerald font-bold">1.2 giây</span>
                    </div>
                    <div className="comp-row">
                      <span>Rủi ro mất thẻ</span>
                      <span className="text-muted">Phạt 50.000đ - 100.000đ</span>
                      <span className="text-emerald font-bold">Không dùng thẻ</span>
                    </div>
                    <div className="comp-row">
                      <span>Trời mưa gió</span>
                      <span className="text-muted">Phải hạ kính quẹt thẻ</span>
                      <span className="text-emerald font-bold">Xe tự qua êm ái</span>
                    </div>
                    <div className="comp-row">
                      <span>Ùn tắc giờ cao điểm</span>
                      <span className="text-muted">Thường xuyên ùn ứ</span>
                      <span className="text-emerald font-bold">Lưu thông liên tục</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 2: SƠ ĐỒ BÃI & Ô ĐỖ                                  */}
            {/* ======================================================== */}
            {activeTab === 2 && (
              <>
                <div className="panel-card">
                  <div className="panel-header-flex">
                    <h3 className="panel-title">Sơ đồ ô đỗ trực tiếp</h3>
                    <div className="floor-tabs">
                      <button
                        className={`floor-btn ${selectedFloor === 'B1' ? 'active' : ''}`}
                        onClick={() => setSelectedFloor('B1')}
                      >
                        Hầm B1 (Khu A - Ô tô)
                      </button>
                      <button
                        className={`floor-btn ${selectedFloor === 'B2' ? 'active' : ''}`}
                        onClick={() => setSelectedFloor('B2')}
                      >
                        Hầm B2 (Khu B - Xe máy)
                      </button>
                    </div>
                  </div>

                  {/* Visual Slot Grid */}
                  <div className="slot-grid-layout">
                    {slotsB1.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      return (
                        <div
                          key={slot.id}
                          className={`slot-box slot-${slot.status} ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => slot.status !== 'occupied' && setSelectedSlot(slot.id)}
                        >
                          <div className="slot-id-label">{slot.id}</div>
                          <div className="slot-vehicle-icon">
                            {slot.status === 'occupied' ? '🚗' : isSelected ? '⭐' : '🟢'}
                          </div>
                          <div className="slot-status-text">
                            {slot.status === 'occupied'
                              ? slot.plate
                              : isSelected
                              ? 'Đang chọn'
                              : 'Trống'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="map-legend-row">
                    <div className="legend-item"><span className="legend-dot dot-available"></span> Ô trống (Có thể đỗ)</div>
                    <div className="legend-item"><span className="legend-dot dot-occupied"></span> Đã có xe đỗ</div>
                    <div className="legend-item"><span className="legend-dot dot-selected"></span> Vị trí bạn đang chọn</div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Thông tin chi tiết ô đỗ đã chọn</h3>
                  <div className="slot-detail-card">
                    <div className="slot-detail-header">
                      <div className="slot-number-badge">{selectedSlot}</div>
                      <div>
                        <h4>Vị trí khu vực hầm {selectedFloor}</h4>
                        <p className="text-muted">Gần sảnh thang máy tháp Đông • Lối ra cổng số 1</p>
                      </div>
                    </div>
                    <div className="slot-detail-meta">
                      <div className="detail-meta-row">
                        <span>Khoảng cách đến thang máy:</span>
                        <b>15 mét</b>
                      </div>
                      <div className="detail-meta-row">
                        <span>Kích thước tiêu chuẩn:</span>
                        <b>2.5m x 5.0m (Phù hợp sedan / SUV)</b>
                      </div>
                      <div className="detail-meta-row">
                        <span>Hệ thống camera giám sát:</span>
                        <b className="text-emerald">Camera hồng ngoại C-04 bao phủ trực diện</b>
                      </div>
                    </div>
                    {session ? (
                      <button className="ht-btn-solid full-w" onClick={onGoToDashboard}>
                        Vào Bảng điều khiển để giữ ô đỗ này →
                      </button>
                    ) : (
                      <button className="ht-btn-solid full-w" onClick={onSwitchToRegister}>
                        Đăng ký tài khoản để giữ chỗ ngay →
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 3: BẢNG GIÁ & VÉ THÁNG                              */}
            {/* ======================================================== */}
            {activeTab === 3 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Gói cước vé tháng ưu đãi</h3>
                  <div className="pricing-cards-container">
                    {/* Plan 1 */}
                    <div className="plan-card">
                      <div className="plan-badge">Phổ biến</div>
                      <div className="plan-type">Vé tháng Xe máy</div>
                      <div className="plan-price">400.000<span className="price-unit">đ/tháng</span></div>
                      <p className="plan-desc">Phù hợp cư dân và nhân viên văn phòng gửi xe cố định hàng ngày.</p>
                      <ul className="plan-features">
                        <li>✓ Ra vào 24/7 không giới hạn số lượt</li>
                        <li>✓ Nhận diện biển số AI tự động mở barie</li>
                        <li>✓ Miễn phí kiểm tra và bơm lốp điện tử</li>
                        <li>✓ Hỗ trợ kích bình ắc quy khi cần</li>
                      </ul>
                      <button className="ht-btn-solid full-w" onClick={session ? onGoToDashboard : onSwitchToRegister}>
                        Đăng ký gói xe máy
                      </button>
                    </div>

                    {/* Plan 2 */}
                    <div className="plan-card featured">
                      <div className="plan-badge badge-featured">Tiết kiệm 35%</div>
                      <div className="plan-type">Vé tháng Ô tô</div>
                      <div className="plan-price">900.000<span className="price-unit">đ/tháng</span></div>
                      <p className="plan-desc">Dành cho chủ xe ô tô 4-7 chỗ, bán tải gửi dài hạn trong hầm.</p>
                      <ul className="plan-features">
                        <li>✓ Ra vào tự động trong 1.2 giây</li>
                        <li>✓ Ô đỗ rộng rãi 2.5m x 5m có mái che</li>
                        <li>✓ Bảo hiểm phương tiện toàn diện trong bãi</li>
                        <li>✓ Nhân viên hỗ trợ quay đầu và xi-nhan đỗ</li>
                      </ul>
                      <button className="ht-btn-solid full-w" onClick={session ? onGoToDashboard : onSwitchToRegister}>
                        Đăng ký gói ô tô
                      </button>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Thanh toán VietQR nhanh chóng</h3>
                  <div className="vietqr-preview-box">
                    <div className="qr-card">
                      <div className="qr-header">
                        <span className="bank-brand">BIDV</span>
                        <span className="vietqr-logo">VietQR</span>
                      </div>
                      <div className="qr-code-placeholder">
                        {/* Clean SVG QR Code Graphic */}
                        <svg width="140" height="140" viewBox="0 0 100 100" fill="#0f172a">
                          <rect x="0" y="0" width="30" height="30" fill="none" stroke="#0f172a" strokeWidth="6"/>
                          <rect x="8" y="8" width="14" height="14" fill="#0f172a"/>
                          <rect x="70" y="0" width="30" height="30" fill="none" stroke="#0f172a" strokeWidth="6"/>
                          <rect x="78" y="8" width="14" height="14" fill="#0f172a"/>
                          <rect x="0" y="70" width="30" height="30" fill="none" stroke="#0f172a" strokeWidth="6"/>
                          <rect x="8" y="78" width="14" height="14" fill="#0f172a"/>
                          <rect x="40" y="10" width="20" height="8"/>
                          <rect x="40" y="24" width="10" height="15"/>
                          <rect x="15" y="40" width="30" height="8"/>
                          <rect x="55" y="40" width="35" height="8"/>
                          <rect x="40" y="60" width="15" height="30"/>
                          <rect x="65" y="60" width="25" height="12"/>
                          <rect x="65" y="80" width="15" height="15"/>
                        </svg>
                      </div>
                      <div className="qr-info-meta">
                        <div>STK: <b>6261378455</b></div>
                        <div>Chủ TK: <b>HT PARKING SYSTEM</b></div>
                      </div>
                    </div>

                    <div className="qr-instructions">
                      <h4>Hướng dẫn thanh toán 1-Chạm:</h4>
                      <ol>
                        <li>Mở ứng dụng ngân hàng bất kỳ (VCB, BIDV, Techcombank, MB, Momo...)</li>
                        <li>Chọn tính năng <b>Quét mã QR</b> và quét mã thanh toán</li>
                        <li>Hệ thống tự động điền số tiền và cú pháp kích hoạt thẻ tháng</li>
                        <li>Hệ thống tự động kích hoạt gói cước trong vòng 30 giây</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 4: AN NINH & PCCC                                    */}
            {/* ======================================================== */}
            {activeTab === 4 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Mạng lưới giám sát an ninh 24/7</h3>
                  <div className="security-specs-grid">
                    <div className="spec-card">
                      <div className="spec-icon">📹</div>
                      <h4>Camera hồng ngoại 4K</h4>
                      <p>Ghi hình độ nét cao, tự động bù sáng trong điều kiện hầm tối và bắt nét biển số chính xác cả ban đêm.</p>
                    </div>
                    <div className="spec-card">
                      <div className="spec-icon">🚒</div>
                      <h4>Hệ thống PCCC Sprinkler</h4>
                      <p>Trang bị đầu phun tự động, cảm biến khói quang học và bình bọt khí CO2 đạt chuẩn kiểm định PCCC quốc gia.</p>
                    </div>
                    <div className="spec-card">
                      <div className="spec-icon">👮</div>
                      <h4>Tuần tra định kỳ 30 phút/lần</h4>
                      <p>Nhân viên bảo vệ kiểm tra khóa xe, chống rò rỉ nhiên liệu và đảm bảo trật tự toàn bộ các tầng hầm.</p>
                    </div>
                    <div className="spec-card">
                      <div className="spec-icon">🛡️</div>
                      <h4>Bảo hiểm trách nhiệm bãi đỗ</h4>
                      <p>Mọi phương tiện gửi tại bãi đều được bảo vệ trong hạn mức bồi hoàn nếu xảy ra rủi ro va quẹt hoặc sự cố.</p>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Quy trình kiểm soát an ninh 2 chiều</h3>
                  <div className="workflow-steps">
                    <div className="step-card">
                      <div className="step-num">Vào</div>
                      <div className="step-content">
                        <h4>Ghi nhận hình ảnh toàn cảnh phương tiện</h4>
                        <p>Camera chụp đồng thời biển số và toàn cảnh xe lúc vào bãi để lưu trữ đối soát tình trạng xe ban đầu.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">Ra</div>
                      <div className="step-content">
                        <h4>Đối soát trùng khớp biển số 100%</h4>
                        <p>Xe chỉ được mở barie xuất bãi khi biển số xe ra trùng khớp hoàn toàn với dữ liệu vé tháng hoặc lượt gửi.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 5: TIỆN ÍCH & CỨU HỘ                                 */}
            {/* ======================================================== */}
            {activeTab === 5 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Tiện ích hỗ trợ tài xế miễn phí</h3>
                  <div className="benefits-list">
                    <div className="benefit-item">
                      <div className="benefit-icon bg-emerald">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Bộ kích bình ắc quy dự phòng 12V</h4>
                        <p>Sẵn sàng thiết bị kích bình tại chốt trực, hỗ trợ miễn phí khi xe ô tô hoặc xe máy của bạn không may hết điện.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Trạm bơm lốp điện tử tự ngắt</h4>
                        <p>Khách hàng có thể tự do kiểm tra và bổ sung áp suất lốp trước khi xuất phát, đảm bảo an toàn trên hành trình.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-amber">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Nhân viên hỗ trợ điều tiết & lùi chuồng</h4>
                        <p>Đội ngũ bảo vệ luôn sẵn lòng hỗ trợ chỉ dẫn làn đường và hướng dẫn thao tác quay đầu, đỗ xe thuận lợi.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Liên hệ tổng đài cứu hộ</h3>
                  <div className="hotline-card-large">
                    <div className="hotline-badge">Đường dây nóng 24/7</div>
                    <a href="tel:19006868" className="hotline-number-large">1900 6868</a>
                    <p className="hotline-desc">
                      Tiếp nhận yêu cầu hỗ trợ sự cố xe, phản ánh chất lượng phục vụ hoặc tra cứu thẻ tháng 24/7/365.
                    </p>
                    <div className="hotline-info-meta">
                      <div>📧 Email: <b>support@htparking.vn</b></div>
                      <div>🏢 Văn phòng: <b>Phòng Quản lý Bãi xe, Tầng B1, HT Tower</b></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
