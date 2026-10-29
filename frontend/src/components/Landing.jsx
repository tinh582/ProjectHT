import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
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
  const [weatherSim, setWeatherSim] = useState('normal'); // 'normal' | 'storm'
  const [selectedFloor, setSelectedFloor] = useState('B1'); // 'B1' | 'B2'
  const [selectedSlot, setSelectedSlot] = useState('A05');
  const [liveStats, setLiveStats] = useState({
    availableCarSlots: 18,
    availableMotoSlots: 42,
    drainageStatus: 'Khô ráo 100% • Bơm tự động sẵn sàng',
    sensorStatus: '100% Cảm biến & Camera AI trực tuyến'
  });

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    const fetchLiveOverview = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/components/user/UserSlotPicker?vehicleType=car', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && mounted) {
          const data = await res.json();
          if (Array.isArray(data.slots) && data.slots.length > 0) {
            const freeCars = data.slots.filter((s) => s.status === 'available').length;
            setLiveStats((prev) => ({
              ...prev,
              availableCarSlots: freeCars || prev.availableCarSlots,
              drainageStatus: data.infrastructure?.drainage || prev.drainageStatus
            }));
          }
        }
      } catch {
        // Fallback to default live demo stats silently
      }
    };
    fetchLiveOverview();
    return () => {
      mounted = false;
    };
  }, [session]);

  const menuItems = [
    {
      id: 'overview',
      menuTitle: 'Tổng quan & Đặc quyền',
      badge: 'Giải pháp Bãi đỗ xe Thông minh & An toàn #1 cho Ô tô - Xe máy',
      headline: 'Chỗ đỗ cố định riêng cho từng xe, hầm khô ráo 100% & ra vào tự động 1.2 giây',
      description:
        'HT Parking mang đến sự an tâm tuyệt đối cho chủ phương tiện: Mỗi gói thuê được khóa độc quyền 1 Ô Đỗ = 1 Biển Số Xe (không bao giờ hết chỗ), hạ tầng thoát nước chống ngập 3 cấp hiện đại, xem trước vị trí trống trước khi thanh toán và duyệt biên lai tự động bằng AI.',
      highlights: [
        { label: 'Cam kết vị trí đỗ', value: '1 Slot = 1 Xe' },
        { label: 'Hệ thống thoát nước', value: 'Khô ráo 100%' },
        { label: 'Xác thực biên lai AI', value: 'Tự động 3s' },
        { label: 'Mở barie nhận diện AI', value: '1.2 giây' }
      ]
    },
    {
      id: 'infrastructure',
      menuTitle: 'Thoát nước & Hạ tầng',
      badge: 'Hạ tầng Kỹ thuật Chống ngập & Cảm biến IoT Tiêu chuẩn Quốc tế',
      headline: 'Hệ thống thoát nước chống ngập 3 cấp — Bảo vệ xe tuyệt đối trong mọi mùa mưa bão',
      description:
        'Nỗi lo ngập nước tầng hầm khi mưa lớn được xóa bỏ hoàn toàn tại HT Parking. Hầm đỗ xe trang bị trạm bơm tiêu úng công nghiệp tự động công suất 450m³/giờ, rãnh thu nước bao quanh từng ô đỗ, phễu chắn tràn tại dốc hầm và cảm biến mực nước cảnh báo sớm 24/7.',
      highlights: [
        { label: 'Công suất bơm tiêu úng', value: '450 m³/giờ' },
        { label: 'Cảm biến ngập & độ ẩm', value: 'IoT Đa điểm' },
        { label: 'Lịch sử ngập úng hầm', value: '0 sự cố' },
        { label: 'Điện dự phòng máy bơm', value: '100% UPS/Máy phát' }
      ]
    },
    {
      id: 'parking-map',
      menuTitle: 'Sơ đồ bãi & 1 Slot = 1 Xe',
      badge: 'Xem trước chỗ trống & Chọn vị trí cố định trước khi thanh toán',
      headline: 'Chủ động chọn đúng ô đỗ yêu thích — Khóa cố định duy nhất cho biển số xe của bạn',
      description:
        'Không còn cảnh mua vé tháng nhưng về muộn vẫn phải chạy lòng vòng tìm chỗ. Tại HT Parking, bạn được xem trực tiếp sơ đồ mặt bằng, kiểm tra tình trạng thoát nước, góc camera và chọn trước ô đỗ gần thang máy trước khi thanh toán.',
      highlights: [
        { label: 'Ràng buộc vị trí', value: '1 Ô = 1 Xe cố định' },
        { label: 'Chính sách bán vé', value: '0% Overbooking' },
        { label: 'Ô trống Ô tô hiện tại', value: `${liveStats.availableCarSlots} vị trí` },
        { label: 'Quy trình giữ chỗ', value: 'Chọn chỗ → Thanh toán' }
      ]
    },
    {
      id: 'ai-plate',
      menuTitle: 'Nhận diện biển số AI',
      badge: 'Công nghệ thị giác máy tính Roboflow AI 99.8%',
      headline: 'Lưu thông siêu tốc không cần quẹt thẻ — Bảo vệ xe 2 chiều bằng mã biển số',
      description:
        'Camera AI độ phân giải cao tự động nhận diện biển số từ khoảng cách 3 - 5m và mở barie trong 1.2 giây. Hệ thống đối soát khép kín 2 chiều gắn liền với vị trí đỗ cố định, ngăn chặn tuyệt đối việc lấy nhầm xe hoặc xe lạ chiếm chỗ.',
      highlights: [
        { label: 'Khoảng cách nhận diện', value: '3 - 5m' },
        { label: 'Tốc độ xử lý AI', value: '60 FPS' },
        { label: 'Độ chính xác biển số', value: '99.82%' },
        { label: 'Thao tác hạ kính/quẹt thẻ', value: '0 chạm' }
      ]
    },
    {
      id: 'pricing',
      menuTitle: 'Bảng giá & Thanh toán AI',
      badge: 'Thanh toán VietQR & Duyệt tự động bằng AI OCR',
      headline: 'Đăng ký trực tuyến minh bạch — Tải ảnh biên lai, AI duyệt và kích hoạt ngay lập tức',
      description:
        'Quy trình đăng ký chuẩn hóa 4 bước rõ ràng: Chọn xe → Chọn ô đỗ cố định → Quét VietQR & tải ảnh biên lai → AI OCR tự động kiểm tra số tiền, nội dung chuyển khoản và mở khóa Bảng điều khiển tức thì kèm thời hạn bắt đầu & kết thúc minh bạch.',
      highlights: [
        { label: 'Vé tháng Xe máy', value: '400.000đ' },
        { label: 'Vé tháng Ô tô (Cố định ô)', value: '900.000đ' },
        { label: 'Công nghệ duyệt thanh toán', value: 'AI OCR Tự động' },
        { label: 'Tiết kiệm so với gửi lượt', value: 'Đến 35%' }
      ]
    },
    {
      id: 'security',
      menuTitle: 'Bảo mật Zero-Data & Cứu hộ',
      badge: 'An ninh 24/7, Bảo mật KYC & Cam kết Zero-Data Retention',
      headline: 'An toàn cho phương tiện trong hầm — Bảo mật tuyệt đối cho thông tin cá nhân của bạn',
      description:
        'Bên cạnh hệ thống PCCC Sprinkler, camera 4K không góc khuất và cứu hộ ắc quy/bơm lốp miễn phí 24/7, HT Parking áp dụng chuẩn bảo mật Zero-Data Retention: Cam kết không sử dụng dữ liệu trái mục đích và xóa sạch 100% thông tin nhạy cảm ngay khi kết thúc hợp đồng.',
      highlights: [
        { label: 'Chính sách dữ liệu', value: 'Zero-Data Retention' },
        { label: 'Xác thực chủ xe', value: 'KYC & Email thật' },
        { label: 'Cứu hộ kích bình & bơm lốp', value: 'Miễn phí 24/7' },
        { label: 'Kênh hỗ trợ nhân viên', value: 'Đa kênh tức thì' }
      ]
    }
  ];

  const current = menuItems[activeTab];

  // Demo slots for Tab 2 (Parking Map)
  const slotsB1 = [
    { id: 'A01', type: 'car', status: 'occupied', plate: '30G-123.45', drainage: 'Khô ráo • Rãnh thoát Kênh A1', cam: 'Cam AI C-01' },
    { id: 'A02', type: 'car', status: 'occupied', plate: '29A-688.86', drainage: 'Khô ráo • Rãnh thoát Kênh A1', cam: 'Cam AI C-01' },
    { id: 'A03', type: 'car', status: 'available', drainage: 'Khô ráo 100% • Sàn chống trượt', cam: 'Cam AI C-02 (Góc rộng)' },
    { id: 'A04', type: 'car', status: 'occupied', plate: '51F-999.99', drainage: 'Khô ráo • Rãnh thoát Kênh A1', cam: 'Cam AI C-02' },
    { id: 'A05', type: 'car', status: 'selected', drainage: 'Khô ráo 100% • Gần trạm bơm hút ẩm', cam: 'Cam AI C-03 (Trực diện)' },
    { id: 'A06', type: 'car', status: 'available', drainage: 'Khô ráo 100% • Rãnh thoát Kênh A2', cam: 'Cam AI C-03 (Trực diện)' },
    { id: 'A07', type: 'car', status: 'occupied', plate: '30E-456.78', drainage: 'Khô ráo • Rãnh thoát Kênh A2', cam: 'Cam AI C-04' },
    { id: 'A08', type: 'car', status: 'available', drainage: 'Khô ráo 100% • Gần sảnh thang máy', cam: 'Cam AI C-04 (Trực diện)' },
    { id: 'A09', type: 'car', status: 'available', drainage: 'Khô ráo 100% • Rãnh thoát Kênh A3', cam: 'Cam AI C-05' },
    { id: 'A10', type: 'car', status: 'occupied', plate: '29D-777.77', drainage: 'Khô ráo • Rãnh thoát Kênh A3', cam: 'Cam AI C-05' },
    { id: 'A11', type: 'car', status: 'available', drainage: 'Khô ráo 100% • Sàn Epoxy cao cấp', cam: 'Cam AI C-06' },
    { id: 'A12', type: 'car', status: 'occupied', plate: '30A-888.88', drainage: 'Khô ráo • Rãnh thoát Kênh A3', cam: 'Cam AI C-06' }
  ];

  const slotsB2 = [
    { id: 'B01', type: 'moto', status: 'occupied', plate: '29B1-456.78', drainage: 'Khô ráo • Rãnh thoát Kênh B1', cam: 'Cam AI M-01' },
    { id: 'B02', type: 'moto', status: 'available', drainage: 'Khô ráo 100% • Sàn chống trượt', cam: 'Cam AI M-01' },
    { id: 'B03', type: 'moto', status: 'available', drainage: 'Khô ráo 100% • Gần thang máy B2', cam: 'Cam AI M-02' },
    { id: 'B04', type: 'moto', status: 'occupied', plate: '30N1-888.99', drainage: 'Khô ráo • Rãnh thoát Kênh B1', cam: 'Cam AI M-02' },
    { id: 'B05', type: 'moto', status: 'available', drainage: 'Khô ráo 100% • Rãnh thoát Kênh B2', cam: 'Cam AI M-03' },
    { id: 'B06', type: 'moto', status: 'available', drainage: 'Khô ráo 100% • Rãnh thoát Kênh B2', cam: 'Cam AI M-03' },
    { id: 'B07', type: 'moto', status: 'occupied', plate: '59T2-112.23', drainage: 'Khô ráo • Rãnh thoát Kênh B2', cam: 'Cam AI M-04' },
    { id: 'B08', type: 'moto', status: 'available', drainage: 'Khô ráo 100% • Gần lối ra cổng 2', cam: 'Cam AI M-04' }
  ];

  const displayedSlots = selectedFloor === 'B1' ? slotsB1 : slotsB2;
  const activeSlotObj =
    displayedSlots.find((s) => s.id === selectedSlot) || displayedSlots[0];

  return (
    <div className="ht-layout">
      {/* ============================================================ */}
      {/* 1. LEFT NAVIGATION SIDEBAR                                   */}
      {/* ============================================================ */}
      <aside className="ht-sidebar">
        {/* Brand Header */}
        <div className="ht-brand-box">
          <div className="ht-brand-logo">
            <span className="logo-ht">HT</span>
            <span className="logo-parking">PARKING</span>
          </div>
          <div className="ht-brand-tag">Bãi đỗ xe thông minh & Chống ngập chuẩn ISO</div>
          <div className="ht-live-badge">
            <span className="live-pulse"></span>
            <span>Hoạt động 24/7 • Hầm khô ráo 100%</span>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                  )}
                  {idx === 2 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  )}
                  {idx === 3 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  )}
                  {idx === 4 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  )}
                  {idx === 5 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
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

        {/* Sidebar Infrastructure Quick Status */}
        <div className="sidebar-infra-widget">
          <div className="infra-widget-title">Trạng thái hạ tầng thời gian thực</div>
          <div className="infra-widget-row">
            <span>💧 Thoát nước:</span>
            <b className="text-emerald">Khô ráo 100%</b>
          </div>
          <div className="infra-widget-row">
            <span>🔒 Chỗ đỗ:</span>
            <b>1 Slot = 1 Xe</b>
          </div>
          <div className="infra-widget-row">
            <span>🚗 Ô tô trống:</span>
            <b className="text-emerald">{liveStats.availableCarSlots} chỗ</b>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="ht-sidebar-footer">
          <div className="hotline-box">
            <div className="hotline-title">Tổng đài hỗ trợ & Cứu hộ 24/7</div>
            <a href="tel:19006868" className="hotline-number">1900 6868</a>
          </div>
          <div className="location-info">
            Tòa nhà HT Tower, Hầm B1 (Ô tô) & B2 (Xe máy)
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
                  Chọn chỗ & Đăng ký ngay
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Live Facility Trust Banner */}
        <div className="ht-trust-banner">
          <div className="trust-item">
            <span className="trust-icon">💧</span>
            <span><b>Hệ thống thoát nước chống ngập:</b> Trạm bơm 3 cấp hoạt động tốt (Độ ẩm chuẩn, 0% ngập úng)</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🎯</span>
            <span><b>Cam kết vị trí cố định:</b> 1 Ô đỗ = 1 Biển số xe duy nhất (Xem trước chỗ trống trước thanh toán)</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🤖</span>
            <span><b>Duyệt thanh toán AI OCR:</b> Kích hoạt tự động sau 3 giây • Bảo mật Zero-Data Retention</span>
          </div>
        </div>

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
            {/* TAB 0: TỔNG QUAN & ĐẶC QUYỀN KHÁCH HÀNG                  */}
            {/* ======================================================== */}
            {activeTab === 0 && (
              <>
                {/* Left column: 6 Reasons Customers Choose HT Parking */}
                <div className="panel-card">
                  <h3 className="panel-title">Vì sao hơn 500+ chủ xe tin chọn HT Parking?</h3>

                  <div className="benefits-list">
                    <div className="benefit-item">
                      <div className="benefit-icon bg-emerald">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Đặc quyền vị trí đỗ cố định (1 Slot = 1 Xe)</h4>
                        <p>Mỗi ô đỗ chỉ định danh duy nhất cho 1 biển số xe của bạn, tuyệt đối không bán vượt chỗ (No Overbooking). Dù bạn về lúc 23h đêm, vị trí riêng của bạn vẫn luôn trống chờ sẵn.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Hệ thống thoát nước chống ngập 3 cấp hiện đại</h4>
                        <p>Trang bị trạm bơm tiêu úng tự động 450m³/giờ, rãnh thu nước bao quanh từng phân khu, van chống tràn ngược và cảm biến mực nước IoT — cam kết hầm khô ráo 100% ngay cả khi mưa bão lịch sử.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-amber">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Xem trước chỗ trống & Chọn vị trí trước khi thanh toán</h4>
                        <p>Khách hàng được tự tay chọn ô đỗ gần thang máy, kiểm tra trạng thái cảm biến, camera và hệ thống thoát nước tại đúng ô đó trước khi quyết định thanh toán.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-emerald">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Xử lý thanh toán tự động bằng AI OCR & Bảo mật Zero-Data</h4>
                        <p>Tải ảnh biên lai chuyển khoản lên hệ thống, AI OCR tự động đọc và kích hoạt gói thuê trong 3 giây. Cam kết bảo mật thông tin và xóa sạch dữ liệu (Zero-Data) khi ngưng hợp đồng.</p>
                      </div>
                    </div>
                  </div>

                  <div className="cta-action-group">
                    {session ? (
                      <button className="ht-btn-solid" onClick={onGoToDashboard}>
                        Chọn xe & Giữ vị trí đỗ ngay →
                      </button>
                    ) : (
                      <button className="ht-btn-solid" onClick={onSwitchToRegister}>
                        Đăng ký chọn ô đỗ cố định ngay →
                      </button>
                    )}
                    <button className="ht-btn-outline" onClick={() => setActiveTab(1)}>
                      Xem hệ thống thoát nước chống ngập
                    </button>
                    <button className="ht-btn-outline" onClick={() => setActiveTab(2)}>
                      Xem sơ đồ chỗ trống
                    </button>
                  </div>
                </div>

                {/* Right column: Smart Gate Preview + 4-Step Onboarding Flow */}
                <div className="panel-card panel-gate-showcase">
                  <div className="gate-image-container">
                    <img
                      src="/smart_parking_gate.jpg"
                      alt="Cổng bãi đỗ xe thông minh HT Parking"
                      className="gate-image"
                    />
                    <div className="gate-status-pill">
                      <span className="live-pulse"></span>
                      <span>Làn vào #01 • AI Camera & Thoát nước hoạt động tốt</span>
                    </div>
                  </div>

                  <div className="gate-telemetry-box">
                    <div className="gate-toggle-tabs">
                      <button
                        className={`gate-tab ${simGate === 'entry' ? 'active' : ''}`}
                        onClick={() => setSimGate('entry')}
                      >
                        Mô phỏng Làn xe vào
                      </button>
                      <button
                        className={`gate-tab ${simGate === 'exit' ? 'active' : ''}`}
                        onClick={() => setSimGate('exit')}
                      >
                        Mô phỏng Làn xe ra
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
                          <span className="meta-k">Phương tiện & Ô đỗ cố định:</span>
                          <span className="meta-v">
                            <b>{simGate === 'entry' ? 'Mazda CX-5 • Ô cố định A-05' : 'Mercedes C300 • Ô cố định A-02'}</b>
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-k">Trạng thái hạ tầng ô đỗ:</span>
                          <span className="meta-v text-emerald">💧 Khô ráo 100% • Camera AI trực diện</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-k">Barie tự động:</span>
                          <span className="meta-v text-emerald">🟢 Mở trong 1.2s • Chỉ dẫn tới đúng ô đỗ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4-Step Transparent Onboarding Flow Box */}
                  <div className="onboarding-flow-mini">
                    <div className="mini-flow-title">Quy trình đăng ký 4 bước minh bạch tại HT Parking</div>
                    <div className="mini-flow-steps">
                      <div className="mini-step">
                        <span className="mini-badge">Bước 1</span>
                        <b>Chọn / Thêm Xe</b>
                        <small>Quét biển số AI</small>
                      </div>
                      <div className="mini-step">
                        <span className="mini-badge">Bước 2</span>
                        <b>Chọn Ô Đỗ Trống</b>
                        <small>Khóa 1 Slot = 1 Xe</small>
                      </div>
                      <div className="mini-step">
                        <span className="mini-badge">Bước 3</span>
                        <b>Thanh Toán AI</b>
                        <small>OCR duyệt biên lai</small>
                      </div>
                      <div className="mini-step">
                        <span className="mini-badge">Bước 4</span>
                        <b>Vào Dashboard</b>
                        <small>Quản lý xe 24/7</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Full-Width Customer Testimonials & Infrastructure Assurance */}
                <div className="panel-card full-span-card">
                  <div className="panel-header-flex">
                    <h3 className="panel-title" style={{ marginBottom: 0 }}>
                      Khách hàng nói gì khi gửi xe dài hạn tại HT Parking?
                    </h3>
                    <span className="rating-pill">⭐ 4.95 / 5.0 (Từ 380+ chủ xe Ô tô & Xe máy)</span>
                  </div>
                  <div className="testimonials-grid">
                    <div className="testimonial-card">
                      <div className="testi-quote">
                        “Đợt mưa lớn ngập khắp phố vừa rồi mình cực kỳ lo cho chiếc xe để ở hầm, nhưng xuống hầm B1 của HT Parking thì sàn khô cong, hệ thống rãnh thoát nước và máy bơm tự động chạy rất êm. Rất đáng đồng tiền!”
                      </div>
                      <div className="testi-author">
                        <b>Anh Nguyễn Minh Tuấn</b> • Chủ xe Mazda CX-5 (Ô đỗ cố định A-05)
                      </div>
                    </div>
                    <div className="testimonial-card">
                      <div className="testi-quote">
                        “Thích nhất là chính sách 1 Slot = 1 Xe cố định và được chọn vị trí trên sơ đồ trước khi thanh toán. Mình hay đi công tác về muộn lúc 11h đêm nhưng ô A-08 gần thang máy của mình luôn được giữ riêng, không ai đỗ tranh.”
                      </div>
                      <div className="testi-author">
                        <b>Chị Trần Thanh Hương</b> • Chủ xe Mercedes C300 (Ô đỗ cố định A-08)
                      </div>
                    </div>
                    <div className="testimonial-card">
                      <div className="testi-quote">
                        “Thanh toán xong chỉ cần tải ảnh chụp màn hình chuyển khoản lên là AI tự động kiểm tra và kích hoạt gói thuê ngay lập tức, hiện rõ ngày bắt đầu, ngày kết thúc và thời gian duyệt. Không phải chờ đợi thủ công.”
                      </div>
                      <div className="testi-author">
                        <b>Anh Lê Hoàng Nam</b> • Chủ xe VinFast VF8 (Ô đỗ cố định A-11)
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 1: HỆ THỐNG THOÁT NƯỚC & HẠ TẦNG KỸ THUẬT            */}
            {/* ======================================================== */}
            {activeTab === 1 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Kiến trúc Hệ thống Thoát nước Chống ngập 3 Cấp</h3>
                  <div className="workflow-steps">
                    <div className="step-card">
                      <div className="step-num">Cấp 1</div>
                      <div className="step-content">
                        <h4>Tấm chắn ngập tự động & Rãnh thu nước dốc hầm</h4>
                        <p>Tại cửa hầm B1 & B2 trang bị hệ thống rãnh cắt nước mưa ngang mặt dốc kết hợp tấm chắn ngập thủy lực tự động nâng lên khi mực nước mặt đường dâng cao, ngăn 100% nước mưa từ ngoài tràn xuống hầm.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">Cấp 2</div>
                      <div className="step-content">
                        <h4>Mạng lưới rãnh thoát sàn Epoxy chuẩn độ dốc 1.5% tại từng ô đỗ</h4>
                        <p>Mỗi phân khu đỗ xe Ô tô (Khu A) và Xe máy (Khu B) đều có hệ thống rãnh thu nước inox bao quanh và phễu thoát sàn chống trào ngược. Nước đọng từ thân xe khi đi mưa về được thu gom tức thì, giữ sàn luôn khô ráo, chống trơn trượt.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">Cấp 3</div>
                      <div className="step-content">
                        <h4>Bể thu ngầm 120m³ & 4 Máy bơm chìm công nghiệp 450m³/giờ</h4>
                        <p>Hệ thống cảm biến mực nước siêu âm IoT tự động kích hoạt tổ hợp 4 máy bơm tiêu úng công suất lớn (kèm nguồn điện máy phát dự phòng độc lập 100%) đẩy nước ra hệ thống thoát nước thành phố qua van một chiều.</p>
                      </div>
                    </div>
                  </div>

                  <div className="cta-action-group">
                    {session ? (
                      <button className="ht-btn-solid" onClick={onGoToDashboard}>
                        Chọn ô đỗ khô ráo & an toàn ngay →
                      </button>
                    ) : (
                      <button className="ht-btn-solid" onClick={onSwitchToRegister}>
                        Đăng ký gửi xe an tâm mùa mưa bão →
                      </button>
                    )}
                    <button className="ht-btn-outline" onClick={() => setActiveTab(2)}>
                      Kiểm tra trạng thái từng ô đỗ
                    </button>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-header-flex">
                    <h3 className="panel-title" style={{ marginBottom: 0 }}>
                      Giám sát Hạ tầng Kỹ thuật & Thoát nước Trực tuyến
                    </h3>
                    <div className="floor-tabs">
                      <button
                        className={`floor-btn ${weatherSim === 'normal' ? 'active' : ''}`}
                        onClick={() => setWeatherSim('normal')}
                      >
                        ☀️ Thời tiết bình thường
                      </button>
                      <button
                        className={`floor-btn ${weatherSim === 'storm' ? 'active' : ''}`}
                        onClick={() => setWeatherSim('storm')}
                      >
                        ⛈️ Mô phỏng Mưa bão lớn
                      </button>
                    </div>
                  </div>

                  <div className="infra-telemetry-panel">
                    <div className="infra-status-banner">
                      <span className="live-pulse"></span>
                      <span>
                        {weatherSim === 'normal'
                          ? 'TRẠNG THÁI HẦM B1 - B2: KHÔ RÁO TUYỆT ĐỐI • ĐỘ ẨM 52%'
                          : 'KÍCH HOẠT CHẾ ĐỘ CHỐNG NGẬP MƯA BÃO • BƠM TIÊU ÚNG ĐANG CHẠY • HẦM KHÔ RÁO 100%'}
                      </span>
                    </div>

                    <div className="security-specs-grid">
                      <div className="spec-card">
                        <div className="spec-icon">💧</div>
                        <h4>Hệ thống Thoát nước & Bơm ngầm</h4>
                        <p>
                          {weatherSim === 'normal'
                            ? 'Mực nước bể thu: 12% (Thấp). Tổ hợp 4 máy bơm chìm ở chế độ chờ tự động (Auto-Standby).'
                            : 'Đang bơm thoát nước tốc độ 420m³/giờ. Van một chiều đã khóa chống tràn ngược. Sàn hầm khô ráo 100%.'}
                        </p>
                      </div>
                      <div className="spec-card">
                        <div className="spec-icon">📡</div>
                        <h4>Cảm biến Siêu âm & IoT</h4>
                        <p>100% cảm biến trần tại từng ô đỗ và cảm biến mực nước rãnh thu đang hoạt động ổn định, độ trễ 0.1 giây.</p>
                      </div>
                      <div className="spec-card">
                        <div className="spec-icon">🌀</div>
                        <h4>Thông gió & Hút ẩm công nghiệp</h4>
                        <p>Hệ thống quạt Jetfan tự động cân bằng độ ẩm dưới 55%, lọc sạch khí thải CO, ngăn ẩm mốc nội thất ô tô.</p>
                      </div>
                      <div className="spec-card">
                        <div className="spec-icon">⚡</div>
                        <h4>Nguồn điện Dự phòng Kép</h4>
                        <p>Máy phát điện Cummins 1000kVA tự động đóng điện trong 3 giây khi mất điện lưới, đảm bảo bơm thoát nước và barie không gián đoạn.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 2: SƠ ĐỒ BÃI & ĐẶC QUYỀN 1 SLOT = 1 XE               */}
            {/* ======================================================== */}
            {activeTab === 2 && (
              <>
                <div className="panel-card">
                  <div className="panel-header-flex">
                    <h3 className="panel-title">Xem trước sơ đồ chỗ trống (Chọn trước khi thanh toán)</h3>
                    <div className="floor-tabs">
                      <button
                        className={`floor-btn ${selectedFloor === 'B1' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFloor('B1');
                          setSelectedSlot('A05');
                        }}
                      >
                        Hầm B1 (Khu A - Ô tô)
                      </button>
                      <button
                        className={`floor-btn ${selectedFloor === 'B2' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFloor('B2');
                          setSelectedSlot('B02');
                        }}
                      >
                        Hầm B2 (Khu B - Xe máy)
                      </button>
                    </div>
                  </div>

                  <div className="fixed-slot-guarantee-bar">
                    🔒 <b>Ràng buộc cứng 1 Slot = 1 Xe:</b> Mỗi vị trí dưới đây chỉ gắn duy nhất với 1 biển số xe và 1 khách hàng. Chọn vào một ô trống để kiểm tra hạ tầng kỹ thuật tại vị trí đó!
                  </div>

                  {/* Visual Slot Grid */}
                  <div className="slot-grid-layout">
                    {displayedSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      return (
                        <div
                          key={slot.id}
                          className={`slot-box slot-${slot.status} ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setSelectedSlot(slot.id)}
                        >
                          <div className="slot-id-label">{slot.id}</div>
                          <div className="slot-vehicle-icon">
                            {slot.status === 'occupied' ? (slot.type === 'car' ? '🚗' : '🛵') : isSelected ? '⭐' : '🟢'}
                          </div>
                          <div className="slot-status-text">
                            {slot.status === 'occupied'
                              ? `Cố định: ${slot.plate}`
                              : isSelected
                              ? 'Đang xem trước'
                              : 'Còn trống'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="map-legend-row">
                    <div className="legend-item"><span className="legend-dot dot-available"></span> Ô còn trống (Có thể khóa cố định)</div>
                    <div className="legend-item"><span className="legend-dot dot-occupied"></span> Đã khóa riêng cho 1 biển số xe</div>
                    <div className="legend-item"><span className="legend-dot dot-selected"></span> Vị trí bạn đang xem trước</div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Hồ sơ kỹ thuật & Cam kết tại ô đỗ {activeSlotObj.id}</h3>
                  <div className="slot-detail-card">
                    <div className="slot-detail-header">
                      <div className="slot-number-badge">{activeSlotObj.id}</div>
                      <div>
                        <h4>Vị trí cố định • Tầng hầm {selectedFloor}</h4>
                        <p className="text-muted">
                          {activeSlotObj.status === 'occupied'
                            ? `Đã được đăng ký độc quyền bởi biển số ${activeSlotObj.plate}`
                            : 'Đang còn trống • Sẵn sàng khóa cố định cho xe của bạn'}
                        </p>
                      </div>
                    </div>
                    <div className="slot-detail-meta">
                      <div className="detail-meta-row">
                        <span>Chính sách giữ chỗ:</span>
                        <b className="text-emerald">1 Slot = 1 Xe cố định (0% Overbooking)</b>
                      </div>
                      <div className="detail-meta-row">
                        <span>Hệ thống thoát nước tại ô:</span>
                        <b className="text-emerald">💧 {activeSlotObj.drainage}</b>
                      </div>
                      <div className="detail-meta-row">
                        <span>Cảm biến & Camera giám sát:</span>
                        <b className="text-emerald">📹 {activeSlotObj.cam} + Cảm biến siêu âm</b>
                      </div>
                      <div className="detail-meta-row">
                        <span>Kích thước tiêu chuẩn:</span>
                        <b>{selectedFloor === 'B1' ? '2.5m x 5.0m (Chuẩn Sedan / SUV 7 chỗ)' : '1.2m x 2.2m (Chuẩn Xe tay ga / Phân khối lớn)'}</b>
                      </div>
                      <div className="detail-meta-row">
                        <span>Khoảng cách sảnh thang máy:</span>
                        <b>15 mét (Có vạch kẻ dẫn đường phát sáng)</b>
                      </div>
                    </div>
                    {session ? (
                      <button className="ht-btn-solid full-w" onClick={onGoToDashboard}>
                        Bước 1: Chọn xe & Khóa vị trí {activeSlotObj.id} này ngay →
                      </button>
                    ) : (
                      <button className="ht-btn-solid full-w" onClick={onSwitchToRegister}>
                        Đăng ký tài khoản để giữ cố định ô {activeSlotObj.id} →
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 3: NHẬN DIỆN BIỂN SỐ AI                             */}
            {/* ======================================================== */}
            {activeTab === 3 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Quy trình nhận diện AI 3 bước & Bảo vệ đúng vị trí</h3>
                  <div className="workflow-steps">
                    <div className="step-card">
                      <div className="step-num">01</div>
                      <div className="step-content">
                        <h4>Camera AI tự động phát hiện phương tiện từ xa</h4>
                        <p>Cảm biến quang học quét khi xe tiến đến vị trí cách barie 3 - 5m, tự động kích hoạt chế độ chụp tốc độ cao bất kể trời mưa hay thiếu sáng.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">02</div>
                      <div className="step-content">
                        <h4>Trích xuất biển số & Đối chiếu ô đỗ cố định trong 0.2s</h4>
                        <p>Mô hình AI Roboflow phân tích ký tự biển số với độ chính xác 99.82%, kiểm tra gói thuê đang hoạt động và xác nhận đúng ô đỗ cố định của xe.</p>
                      </div>
                    </div>
                    <div className="step-card">
                      <div className="step-num">03</div>
                      <div className="step-content">
                        <h4>Tự động nâng barie & Điều hướng tới ô đỗ riêng</h4>
                        <p>Hệ thống mở barie trong 1.2s không cần quẹt thẻ, đồng thời bảng LED hiển thị mã ô đỗ cố định của bạn và ghi nhận lịch sử vào/ra theo thời gian thực.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">So sánh HT Parking với bãi xe truyền thống</h3>
                  <div className="comparison-table">
                    <div className="comp-row comp-header">
                      <span>Tiêu chí</span>
                      <span>Bãi xe truyền thống</span>
                      <span className="highlight-col">HT Parking AI</span>
                    </div>
                    <div className="comp-row">
                      <span>Cam kết vị trí đỗ</span>
                      <span className="text-muted">Ai đến trước đỗ trước</span>
                      <span className="text-emerald font-bold">1 Slot = 1 Xe cố định</span>
                    </div>
                    <div className="comp-row">
                      <span>Chống ngập mùa mưa</span>
                      <span className="text-muted">Dễ đọng nước, ngập úng</span>
                      <span className="text-emerald font-bold">Bơm thoát nước 3 cấp</span>
                    </div>
                    <div className="comp-row">
                      <span>Chọn chỗ trước khi trả tiền</span>
                      <span className="text-muted">Không được xem trước</span>
                      <span className="text-emerald font-bold">Xem & chọn trực tiếp</span>
                    </div>
                    <div className="comp-row">
                      <span>Duyệt thanh toán vé tháng</span>
                      <span className="text-muted">Chờ nhân viên 12-24h</span>
                      <span className="text-emerald font-bold">AI OCR duyệt trong 3s</span>
                    </div>
                    <div className="comp-row">
                      <span>Thời gian qua trạm barie</span>
                      <span className="text-muted">15 - 30s (Hạ kính quẹt thẻ)</span>
                      <span className="text-emerald font-bold">1.2 giây (Không chạm)</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 4: BẢNG GIÁ & THANH TOÁN TỰ ĐỘNG AI OCR             */}
            {/* ======================================================== */}
            {activeTab === 4 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Gói cước vé tháng (Đã bao gồm Ô đỗ cố định & Bảo hiểm ngập nước)</h3>
                  <div className="pricing-cards-container">
                    {/* Plan 1 */}
                    <div className="plan-card">
                      <div className="plan-badge">Tiết kiệm</div>
                      <div className="plan-type">Vé tháng Xe máy</div>
                      <div className="plan-price">400.000<span className="price-unit">đ/tháng</span></div>
                      <p className="plan-desc">Phù hợp cư dân và nhân viên văn phòng cần vị trí đỗ xe cố định, khô ráo mỗi ngày.</p>
                      <ul className="plan-features">
                        <li>✓ Khóa cố định 1 vị trí đỗ riêng tại Khu B</li>
                        <li>✓ Xem và chọn chỗ trống trước khi thanh toán</li>
                        <li>✓ Ra vào 24/7 bằng nhận diện biển số AI</li>
                        <li>✓ Hầm B2 thoát nước chống ngập & miễn phí bơm lốp</li>
                      </ul>
                      <button className="ht-btn-solid full-w" onClick={session ? onGoToDashboard : onSwitchToRegister}>
                        Chọn xe & Đăng ký gói Xe máy
                      </button>
                    </div>

                    {/* Plan 2 */}
                    <div className="plan-card featured">
                      <div className="plan-badge badge-featured">Được chọn nhiều nhất</div>
                      <div className="plan-type">Vé tháng Ô tô (1 Slot = 1 Xe)</div>
                      <div className="plan-price">900.000<span className="price-unit">đ/tháng</span></div>
                      <p className="plan-desc">Dành cho chủ xe Ô tô 4-7 chỗ muốn bảo vệ xe tuyệt đối khỏi mưa ngập và luôn có chỗ đỗ riêng.</p>
                      <ul className="plan-features">
                        <li>✓ <b>Đặc quyền 1 Ô đỗ = 1 Biển số xe cố định</b></li>
                        <li>✓ <b>Bảo vệ chống ngập 100%</b> với trạm bơm 3 cấp</li>
                        <li>✓ Duyệt biên lai tự động bằng AI OCR trong 3 giây</li>
                        <li>✓ Ghi nhận rõ ngày bắt đầu, kết thúc & giờ duyệt</li>
                      </ul>
                      <button className="ht-btn-solid full-w" onClick={session ? onGoToDashboard : onSwitchToRegister}>
                        Chọn xe & Giữ ô đỗ Ô tô ngay
                      </button>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Xác thực Thanh toán Tự động bằng AI OCR & VietQR</h3>
                  <div className="vietqr-preview-box">
                    <div className="qr-card">
                      <div className="qr-header">
                        <span className="bank-brand">BIDV</span>
                        <span className="vietqr-logo">VietQR</span>
                      </div>
                      <div className="qr-code-placeholder">
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
                      <h4>Quy trình 4 bước: Chọn chỗ trước — AI kích hoạt tức thì</h4>
                      <ol>
                        <li><b>Bước 1 (Chọn xe):</b> Đăng ký biển số xe của bạn bằng AI nhận diện tự động.</li>
                        <li><b>Bước 2 (Chọn ô đỗ):</b> Xem sơ đồ chỗ trống và khóa cố định 1 vị trí đỗ cho xe.</li>
                        <li><b>Bước 3 (Thanh toán & AI OCR):</b> Quét mã VietQR và tải ảnh chụp màn hình biên lai chuyển khoản lên hệ thống.</li>
                        <li><b>Bước 4 (Duyệt tự động):</b> Mô hình AI OCR tự động đối chiếu số tiền, nội dung giao dịch và mở khóa Bảng điều khiển ngay lập tức kèm đầy đủ lịch sử (STT, Mã GD, Giờ đặt gói, Ảnh xác thực, Chu kỳ thuê & Timestamp duyệt).</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 5: AN NINH, BẢO MẬT ZERO-DATA & CỨU HỘ 24/7          */}
            {/* ======================================================== */}
            {activeTab === 5 && (
              <>
                <div className="panel-card">
                  <h3 className="panel-title">Bảo mật Thông tin KYC & Cam kết Zero-Data Retention</h3>
                  <div className="benefits-list">
                    <div className="benefit-item">
                      <div className="benefit-icon bg-emerald">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Định danh chính chủ KYC (Email thật, SĐT, Địa chỉ, CCCD 2 mặt)</h4>
                        <p>Đảm bảo 100% phương tiện trong bãi đều có chủ sở hữu xác thực rõ ràng, bảo vệ quyền lợi pháp lý khi xảy ra sự cố và cho phép cả khách hàng lẫn ban quản lý cập nhật thông tin minh bạch 2 chiều.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Cam kết không sử dụng dữ liệu trái mục đích</h4>
                        <p>Thông tin cá nhân và hình ảnh CCCD của khách hàng chỉ phục vụ duy nhất cho việc định danh hợp đồng gửi xe, tuyệt đối không chia sẻ cho bên thứ ba dưới mọi hình thức.</p>
                      </div>
                    </div>

                    <div className="benefit-item">
                      <div className="benefit-icon bg-amber">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </div>
                      <div className="benefit-content">
                        <h4>Cơ chế Zero-Data Retention (Xóa sạch dữ liệu sau khi hủy)</h4>
                        <p>Ngay khi kết thúc hợp đồng thuê hoặc theo yêu cầu của khách hàng, hệ thống tự động thực thi quy trình xóa trắng (Zero-Data / Hard Purge) toàn bộ ảnh CCCD, SĐT và địa chỉ khỏi máy chủ.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <h3 className="panel-title">Tiện ích Cứu hộ Miễn phí & Hỗ trợ Đa kênh 24/7</h3>
                  <div className="security-specs-grid" style={{ marginBottom: '16px' }}>
                    <div className="spec-card">
                      <div className="spec-icon">🔋</div>
                      <h4>Kích bình ắc quy 12V & Bơm lốp</h4>
                      <p>Hỗ trợ kích bình ắc quy dự phòng và trạm bơm lốp điện tử tự ngắt hoàn toàn miễn phí 24/7 tại cả 2 tầng hầm.</p>
                    </div>
                    <div className="spec-card">
                      <div className="spec-icon">🚒</div>
                      <h4>PCCC Sprinkler & Bảo hiểm</h4>
                      <p>Hệ thống đầu phun chữa cháy tự động, camera hồng ngoại 4K 100% diện tích và bảo hiểm toàn diện cho phương tiện.</p>
                    </div>
                  </div>

                  <div className="hotline-card-large">
                    <div className="hotline-badge">Tổng đài & Thông báo Nhân viên Đa kênh 24/7</div>
                    <a href="tel:19006868" className="hotline-number-large">1900 6868</a>
                    <p className="hotline-desc">
                      Mọi ý kiến phản hồi, yêu cầu hỗ trợ thanh toán hoặc sự cố tại bãi xe đều được gửi tự động tức thì tới nhân viên trực ban qua <b>Dashboard Notification, Email, Telegram/Zalo Bot và SMS</b>.
                    </p>
                    <div className="hotline-info-meta">
                      <div>📧 Email hỗ trợ: <b>support@htparking.vn</b></div>
                      <div>🏢 Văn phòng trực: <b>Phòng Quản lý Bãi xe, Tầng B1, HT Tower</b></div>
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
