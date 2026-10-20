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

  const menuItems = [
    {
      id: 'home',
      menuTitle: 'TRANG CHỦ',
      badge: 'HỆ THỐNG QUẢN LÝ BÃI ĐỖ XE THÔNG MINH HT PARKING',
      headline: 'ĐỖ XE THÔNG MINH, AN TÂM MỌI HÀNH TRÌNH',
      description: 'HT Parking mang đến giải pháp đỗ xe thông minh toàn diện với công nghệ nhận diện biển số tự động AI, kiểm tra ô trống theo thời gian thực và thanh toán VietQR không tiền mặt. Không dừng chờ bấm thẻ, bảo vệ phương tiện 24/7/365.',
      highlights: [
        { label: 'Tốc độ mở barie', value: '< 1.2 Giây' },
        { label: 'Độ chuẩn xác AI', value: '99.8%' },
        { label: 'Thao tác thẻ từ', value: '0 Thẻ giấy/từ' },
        { label: 'Giám sát an ninh', value: '24/7/365' }
      ],
      features: [
        {
          title: 'Nhận diện biển số tự động AI',
          desc: 'Camera thông minh nhận diện xe ngay từ xa, barie tự động mở không cần chạm thẻ từ.'
        },
        {
          title: 'Tra cứu & chọn ô trống trực tiếp',
          desc: 'Biết trước số lượng chỗ còn trống theo từng khu vực trước khi xuất phát đến nơi.'
        },
        {
          title: 'Gói cước tháng tiết kiệm vượt trội',
          desc: 'Tiết kiệm chi phí đáng kể cho cư dân tòa nhà và nhân viên làm việc thường xuyên.'
        },
        {
          title: 'Hệ thống an ninh giám sát đa tầng',
          desc: 'Camera hồng ngoại bao phủ toàn bộ bãi đỗ kết hợp nhân viên bảo vệ túc trực 24/7.'
        }
      ]
    },
    {
      id: 'ai-plate',
      menuTitle: 'NHẬN DIỆN BIỂN SỐ',
      badge: 'CÔNG NGHỆ THỊ GIÁC MÁY TÍNH ROBOFLOW AI',
      headline: 'RA VÀO SIÊU TỐC, TẠM BIỆT THẺ TỪ TRUYỀN THỐNG',
      description: 'Hệ thống camera AI nhận diện biển số phương tiện chính xác tới 99.8% trong mọi điều kiện ánh sáng hay thời tiết. Khách hàng chỉ cần lái xe chậm qua cổng mà không cần hạ kính bấm thẻ.',
      highlights: [
        { label: 'Thời gian mở barie', value: '1.2 Giây' },
        { label: 'Tỷ lệ nhận diện', value: '99.82%' },
        { label: 'Thao tác thủ công', value: '0 Thao tác' },
        { label: 'Tốc độ quét', value: '60 FPS' }
      ],
      features: [
        {
          title: 'Lưu thông siêu tốc qua trạm',
          desc: 'Barie tự động nhấc trong tích tắc, xe di chuyển mượt mà không lo ùn tắc giờ cao điểm.'
        },
        {
          title: 'Loại bỏ hoàn toàn rủi ro rơi mất thẻ',
          desc: 'Biển số xe chính là mã nhận diện an toàn của bạn, không còn phiền toái đền bù mất thẻ.'
        },
        {
          title: 'Ghi nhận thời gian minh bạch từng giây',
          desc: 'Thời gian bắt đầu vào đỗ và rời bãi được hệ thống ghi nhận chính xác, minh bạch.'
        },
        {
          title: 'Thông báo đẩy tức thì trên ứng dụng',
          desc: 'Nhận thông báo khi xe qua cổng giúp bạn luôn an tâm kiểm soát phương tiện của mình.'
        }
      ]
    },
    {
      id: 'booking',
      menuTitle: 'SƠ ĐỒ BÃI ĐỖ',
      badge: 'SƠ ĐỒ BÃI ĐỖ XE TRỰC QUAN THEO THỜI GIAN THỰC',
      headline: 'TRA CỨU Ô TRỐNG & GIỮ VỊ TRÍ ĐỖ THUẬN TIỆN',
      description: 'Không còn cảnh lái xe vòng quanh tìm chỗ đỗ. Hệ thống cung cấp sơ đồ trực quan theo từng khu vực, cho phép bạn chủ động chọn và giữ chỗ trước khi đến bãi đỗ.',
      highlights: [
        { label: 'Cập nhật ô trống', value: 'Thời gian thực' },
        { label: 'Quy trình chọn chỗ', value: '3 Thao tác' },
        { label: 'Làn xe khoa học', value: 'Phân luồng rõ' },
        { label: 'Khu vực bãi', value: 'Phân tầng A / B' }
      ],
      features: [
        {
          title: 'Nắm bắt trạng thái bãi đỗ trực tiếp',
          desc: 'Tra cứu số lượng vị trí trống trên điện thoại hoặc máy tính trước khi khởi hành.'
        },
        {
          title: 'Chủ động giữ chỗ trước giờ cao điểm',
          desc: 'Đảm bảo chắc chắn vị trí đậu xe cho các cuộc hẹn quan trọng hoặc sự kiện đông người.'
        },
        {
          title: 'Lối đi rộng rãi, biển báo rõ ràng',
          desc: 'Thiết kế làn xe đạt chuẩn, biển chỉ dẫn điện tử giúp di chuyển và quay đầu xe an toàn.'
        },
        {
          title: 'Phân loại khu vực đỗ khoa học',
          desc: 'Khu vực riêng biệt dành cho xe máy, ô tô 4-7 chỗ và ô tô bán tải/SUV.'
        }
      ]
    },
    {
      id: 'payment',
      menuTitle: 'BẢNG GIÁ & VÉ THÁNG',
      badge: 'BẢNG GIÁ MINH BẠCH & GÓI CƯỚC ƯU ĐÃI',
      headline: 'THANH TOÁN VIETQR NHANH CHÓNG, TIẾT KIỆM 35%',
      description: 'Hỗ trợ quét mã VietQR tự động qua tất cả các ứng dụng ngân hàng và ví điện tử. Đăng ký vé tháng trực tuyến để nhận mức giá ưu đãi dành cho cư dân và người đi làm.',
      highlights: [
        { label: 'Vé tháng xe máy', value: '400.000 đ/th' },
        { label: 'Vé tháng ô tô', value: '900.000 đ/th' },
        { label: 'Thanh toán QR', value: 'Quét 1-Chạm' },
        { label: 'Tiết kiệm chi phí', value: 'Đến 35%' }
      ],
      features: [
        {
          title: 'Quét mã VietQR tiện lợi',
          desc: 'Hỗ trợ thanh toán nhanh bằng ứng dụng mọi ngân hàng tại Việt Nam, tiền vào đối soát tức thì.'
        },
        {
          title: 'Gói vé tháng ưu đãi',
          desc: 'Tiết kiệm chi phí tối đa cho cư dân và nhân viên tòa nhà gửi xe thường xuyên hàng ngày.'
        },
        {
          title: 'Gia hạn trực tuyến không cần xếp hàng',
          desc: 'Gia hạn hoặc chuyển đổi gói cước linh hoạt ngay trên Bảng điều khiển chỉ trong vài giây.'
        },
        {
          title: 'Đối soát chi phí minh bạch',
          desc: 'Dễ dàng tra cứu lịch sử nạp thẻ, hóa đơn và thời lượng đỗ xe bất cứ lúc nào.'
        }
      ]
    },
    {
      id: 'security',
      menuTitle: 'AN NINH & GIÁM SÁT',
      badge: 'TIÊU CHUẨN AN NINH & BẢO VỆ ĐA TẦNG',
      headline: 'HỆ THỐNG GIÁM SÁT 24/7, AN TOÀN TUYỆT ĐỐI CHO XE',
      description: 'Bãi đỗ được trang bị camera hồng ngoại độ phân giải cao bao phủ toàn bộ các góc khuất, cùng đội ngũ nhân viên bảo vệ tuần tra liên tục cả ngày lẫn đêm.',
      highlights: [
        { label: 'Phạm vi giám sát', value: '100% Góc bãi' },
        { label: 'Thời gian túc trực', value: '24/7/365' },
        { label: 'PCCC tự động', value: 'Báo khói chuẩn' },
        { label: 'Kiểm soát ra vào', value: 'Đối soát 2 chiều' }
      ],
      features: [
        {
          title: 'Camera hồng ngoại Full HD 24/7',
          desc: 'Ghi hình sắc nét ngay cả trong hầm đỗ xe thiếu sáng hoặc vào ban đêm.'
        },
        {
          title: 'Kiểm soát phương tiện 2 chiều nghiêm ngặt',
          desc: 'Xe chỉ được phép xuất bãi khi biển số và hình ảnh trùng khớp với dữ liệu lúc vào.'
        },
        {
          title: 'Hệ thống phòng cháy chữa cháy tự động',
          desc: 'Trang bị cảm biến khói nhiệt, bình chữa cháy hiện đại và hệ thống phun nước tự động.'
        },
        {
          title: 'Đội tuần tra an ninh thường trực',
          desc: 'Nhân viên bảo vệ hỗ trợ tài xế, hướng dẫn làn và xử lý mọi sự cố tức thì.'
        }
      ]
    },
    {
      id: 'support',
      menuTitle: 'TIỆN ÍCH & CỨU HỘ',
      badge: 'DỊCH VỤ GIA TĂNG TẬN TÂM & CHU ĐÁO',
      headline: 'ĐỒNG HÀNH VÀ HỖ TRỢ TÀI XẾ TRONG MỌI TÌNH HUỐNG',
      description: 'HT Parking luôn chuẩn bị sẵn sàng thiết bị cứu hộ tại chỗ: kích bình ắc quy khi xe hết điện, trạm bơm lốp tự động miễn phí và tổng đài tiếp nhận thông tin 24/7.',
      highlights: [
        { label: 'Hotline cứu hộ', value: '1900 6868' },
        { label: 'Trạm bơm lốp', value: 'Miễn phí 100%' },
        { label: 'Kích bình ắc quy', value: 'Sẵn sàng 24/7' },
        { label: 'Thời gian phục vụ', value: 'Túc trực 24/7' }
      ],
      features: [
        {
          title: 'Hỗ trợ kích bình ắc quy miễn phí',
          desc: 'Trang bị bộ kích bình đa năng sẵn sàng hỗ trợ khi xe bạn không may gặp sự cố hết điện.'
        },
        {
          title: 'Máy bơm lốp điện tử tự ngắt',
          desc: 'Khách hàng có thể tự do kiểm tra và bổ sung áp suất lốp trước khi xuất phát.'
        },
        {
          title: 'Nhân viên hỗ trợ quay đầu & lùi chuồng',
          desc: 'Đội ngũ trực chốt sẵn lòng hướng dẫn tài xế đưa xe vào ô đỗ an toàn, chuẩn xác.'
        },
        {
          title: 'Đường dây nóng hỗ trợ 24/7',
          desc: 'Tổng đài chăm sóc khách hàng luôn túc trực lắng nghe và giải đáp mọi thắc mắc.'
        }
      ]
    }
  ];

  const current = menuItems[activeTab];

  return (
    <div className="pgr-app-layout">
      {/* ============================================================ */}
      {/* 1. LEFT NAVIGATION RAIL (PUNISHING: GRAY RAVEN LIGHT THEME)   */}
      {/* ============================================================ */}
      <div className="pgr-sidebar">
        {/* Top-Left Brand Logo */}
        <div className="pgr-sidebar-brand">
          <div className="brand-title">
            HT<span className="brand-accent">PARKING</span>
          </div>
          <div className="brand-subtitle">SMART MOBILITY SYSTEM</div>

          {/* 3-line Menu Icon (Authentic to PGR) */}
          <div className="brand-menu-bars" title="HT Parking Navigation">
            <span className="bar bar-1"></span>
            <span className="bar bar-2"></span>
            <span className="bar bar-3"></span>
          </div>
        </div>

        {/* Vertical Left Navigation Menu */}
        <nav className="pgr-nav-list" role="tablist">
          {menuItems.map((item, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                id={`pgr-tab-${item.id}`}
                className={`pgr-nav-button ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                <span className="nav-accent-bar"></span>
                <span className="nav-button-text">{item.menuTitle}</span>
              </button>
            );
          })}

          {/* If Logged in, show direct Dashboard Access Button */}
          {session && (
            <button
              className="pgr-nav-button nav-button-dashboard"
              onClick={onGoToDashboard}
              id="rail-dashboard-btn"
              title="Đi tới Bảng điều khiển"
            >
              <span className="nav-accent-bar"></span>
              <span className="nav-button-text">⚡ BẢNG ĐIỀU KHIỂN</span>
            </button>
          )}
        </nav>

        {/* Left Rail Technical Footnote */}
        <div className="pgr-sidebar-footer">
          <div className="sidebar-status-pill">
            <span className="pulse-green-dot"></span>
            <span className="status-text">HỆ THỐNG TRỰC TUYẾN</span>
          </div>
          <div className="system-version-code">[HT-SYS v2.5] • HOTLINE: 1900 6868</div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE / SHOWCASE STAGE                           */}
      {/* ============================================================ */}
      <div className="pgr-workspace">
        {/* Top Header Bar */}
        <header className="pgr-topbar-light">
          <div className="topbar-tagline">
            Bãi đỗ xe thông minh • An toàn tuyệt đối • Tiết kiệm thời gian
          </div>

          <div className="topbar-actions">
            {session ? (
              <div className="topbar-user-group">
                <div className="user-id-card">
                  <span className="user-id-icon">👤</span>
                  <span className="user-id-email">{session.user.email}</span>
                  <span className="user-id-role">
                    {role === 'admin' ? 'Quản trị viên' : role === 'staff' ? 'Nhân viên' : 'Khách hàng'}
                  </span>
                </div>

                <button
                  className="btn-enter-dashboard"
                  onClick={onGoToDashboard}
                  id="landing-dashboard-btn"
                >
                  Vào Bảng điều khiển →
                </button>

                <button
                  className="btn-signout"
                  onClick={onLogout}
                  id="landing-logout-btn"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="topbar-guest-group">
                <button
                  className="btn-login-light"
                  onClick={onSwitchToLogin}
                  id="landing-login-btn"
                >
                  Đăng nhập
                </button>
                <button
                  className="btn-register-light"
                  onClick={onSwitchToRegister}
                  id="landing-register-btn"
                >
                  Đăng ký tài khoản
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Center Canvas Stage */}
        <main className="pgr-canvas" key={current.id}>
          {/* Header Row of the Active Section */}
          <div className="canvas-header">
            <span className="canvas-badge">{current.badge}</span>
            <h1 className="canvas-title">{current.headline}</h1>
            <p className="canvas-desc">{current.description}</p>

            {/* Metrics Strip */}
            <div className="canvas-metrics-grid">
              {current.highlights.map((h, i) => (
                <div key={i} className="metric-cell">
                  <div className="metric-number">{h.value}</div>
                  <div className="metric-caption">{h.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column Content & Interactive Showcase */}
          <div className="canvas-body-grid">
            {/* Left Column: Feature List Cards & Action Buttons */}
            <div className="canvas-left-column">
              <div className="features-card-grid">
                {current.features.map((feat, i) => (
                  <div key={i} className="feature-item-card">
                    <div className="feature-check">✓</div>
                    <div className="feature-text">
                      <h4 className="feature-title">{feat.title}</h4>
                      <p className="feature-caption">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons Row */}
              <div className="canvas-cta-row">
                {session ? (
                  <>
                    <button
                      className="btn-primary-action"
                      onClick={onGoToDashboard}
                      id="content-dashboard-cta"
                    >
                      Vào Bảng điều khiển của bạn →
                    </button>
                    <button
                      className="btn-secondary-action"
                      onClick={() => setActiveTab(3)}
                      id="content-pricing-cta"
                    >
                      Xem bảng giá & Gói cước
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-primary-action"
                      onClick={onSwitchToRegister}
                      id="content-register-cta"
                    >
                      Đăng ký trải nghiệm ngay →
                    </button>
                    <button
                      className="btn-secondary-action"
                      onClick={onSwitchToLogin}
                      id="content-login-cta"
                    >
                      Đăng nhập tài khoản
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Tab-Specific Interactive Live Widget */}
            <div className="canvas-right-column">
              {/* Widget for Tab 0: Home / Overview */}
              {current.id === 'home' && (
                <div className="stage-widget-card">
                  <div className="widget-card-top">
                    <span className="widget-status-badge">● LÀN KIỂM SOÁT VÀO #01 • TRỰC TUYẾN</span>
                    <div className="widget-gate-toggle">
                      <button
                        className={`gate-toggle-btn ${simGate === 'entry' ? 'active' : ''}`}
                        onClick={() => setSimGate('entry')}
                      >
                        Làn Vào
                      </button>
                      <button
                        className={`gate-toggle-btn ${simGate === 'exit' ? 'active' : ''}`}
                        onClick={() => setSimGate('exit')}
                      >
                        Làn Ra
                      </button>
                    </div>
                  </div>

                  <div className="camera-viewfinder-box">
                    <div className="laser-scanner-line"></div>
                    <div className="viewfinder-plate-card">
                      <span className="plate-code-text">
                        {simGate === 'entry' ? '29A - 888.88' : '30F - 626.86'}
                      </span>
                      <span className="plate-status-ok">✓ ĐÃ XÁC THỰC BIỂN SỐ HỢP LỆ</span>
                    </div>
                  </div>

                  <div className="widget-telemetry-grid">
                    <div className="telemetry-item">
                      <span className="t-lbl">Phương tiện:</span>
                      <span className="t-val"><b>{simGate === 'entry' ? 'Toyota Camry' : 'Honda SH 150i'}</b></span>
                    </div>
                    <div className="telemetry-item">
                      <span className="t-lbl">Gói cước:</span>
                      <span className="t-val-pill">{simGate === 'entry' ? 'Thẻ tháng Ô tô' : 'Thẻ tháng Xe máy'}</span>
                    </div>
                    <div className="telemetry-item">
                      <span className="t-lbl">Trạng thái Barie:</span>
                      <span className="t-val-open">🟢 TỰ ĐỘNG MỞ • XIN MỜI QUA</span>
                    </div>
                    <div className="telemetry-item">
                      <span className="t-lbl">Chỗ trống trực tiếp:</span>
                      <span className="t-val">Khu A: <b style={{ color: '#059669' }}>14 chỗ</b> • Khu B: <b style={{ color: '#059669' }}>28 chỗ</b></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Widget for Tab 1: AI Camera Plate Scanner */}
              {current.id === 'ai-plate' && (
                <div className="stage-widget-card">
                  <div className="widget-card-top">
                    <span className="widget-status-badge">● ROBOFLOW AI VISION SYSTEM</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tốc độ 60 FPS</span>
                  </div>

                  <div className="camera-viewfinder-box">
                    <div className="laser-scanner-line"></div>
                    <div className="viewfinder-plate-card">
                      <span className="plate-code-text">29A - 888.88</span>
                      <span className="plate-status-ok">✓ TỶ LỆ TRÙNG KHỚP: 99.82%</span>
                    </div>
                  </div>

                  <div className="widget-telemetry-grid">
                    <div className="telemetry-item">
                      <span className="t-lbl">Thời gian trích xuất AI:</span>
                      <span className="t-val font-bold">0.26 Giây</span>
                    </div>
                    <div className="telemetry-item">
                      <span className="t-lbl">Góc quét camera:</span>
                      <span className="t-val">120° Camera kép hồng ngoại</span>
                    </div>
                    <div className="telemetry-item">
                      <span className="t-lbl">Chế độ hoạt động:</span>
                      <span className="t-val-open">Tự động mở barie không chạm</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Widget for Tab 2: Sơ đồ bãi đỗ */}
              {current.id === 'booking' && (
                <div className="stage-widget-card">
                  <div className="widget-card-top">
                    <span className="widget-status-badge">● SƠ ĐỒ VỊ TRÍ BÃI ĐỖ THEO TẦNG</span>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>42 / 70 Chỗ còn trống</span>
                  </div>

                  {/* Visual Parking Slots Simulation */}
                  <div className="slots-preview-container">
                    <div className="slot-zone-header">Khu A (Dành cho Ô Tô) • Tầng 1</div>
                    <div className="slots-mini-grid">
                      <div className="slot-box-mini available">A-01<br/><span>Trống</span></div>
                      <div className="slot-box-mini occupied">A-02<br/><span>Đỗ</span></div>
                      <div className="slot-box-mini available">A-03<br/><span>Trống</span></div>
                      <div className="slot-box-mini reserved">A-04<br/><span>Đã giữ</span></div>
                      <div className="slot-box-mini occupied">A-05<br/><span>Đỗ</span></div>
                      <div className="slot-box-mini available">A-06<br/><span>Trống</span></div>
                    </div>

                    <div className="slot-zone-header" style={{ marginTop: '14px' }}>Khu B (Dành cho Xe Máy) • Tầng 1</div>
                    <div className="slots-mini-grid">
                      <div className="slot-box-mini available">B-01<br/><span>Trống</span></div>
                      <div className="slot-box-mini available">B-02<br/><span>Trống</span></div>
                      <div className="slot-box-mini occupied">B-03<br/><span>Đỗ</span></div>
                      <div className="slot-box-mini occupied">B-04<br/><span>Đỗ</span></div>
                      <div className="slot-box-mini available">B-05<br/><span>Trống</span></div>
                      <div className="slot-box-mini available">B-06<br/><span>Trống</span></div>
                    </div>
                  </div>

                  <div className="slots-legend-row">
                    <span className="legend-item"><span className="legend-dot green"></span> Ô trống</span>
                    <span className="legend-item"><span className="legend-dot gray"></span> Đang đỗ</span>
                    <span className="legend-item"><span className="legend-dot orange"></span> Đã giữ chỗ</span>
                  </div>
                </div>
              )}

              {/* Widget for Tab 3: Bảng giá vé tháng */}
              {current.id === 'payment' && (
                <div className="pricing-side-preview">
                  {/* Card Xe Máy */}
                  <div className="plan-light-box">
                    <div className="plan-light-top">
                      <span className="plan-icon-lg">🛵</span>
                      <div>
                        <h4 className="plan-title-lg">Thẻ tháng Xe Máy</h4>
                        <span className="plan-badge-pill">Phổ biến</span>
                      </div>
                    </div>
                    <div className="plan-price-lg">
                      <strong className="price-num">400.000</strong>
                      <span className="price-unit">VNĐ / tháng</span>
                    </div>
                    <ul className="plan-checklist">
                      <li>✓ Nhận diện AI không cần thẻ từ</li>
                      <li>✓ Ra vào 24/7 không giới hạn</li>
                      <li>✓ Trạm bơm lốp tự động miễn phí</li>
                    </ul>
                    <button className="btn-plan-action" onClick={onGoToDashboard}>
                      {session ? 'Đăng ký / Gia hạn gói này →' : 'Đăng ký tài khoản ngay'}
                    </button>
                  </div>

                  {/* Card Ô Tô */}
                  <div className="plan-light-box featured">
                    <div className="plan-light-top">
                      <span className="plan-icon-lg">🚗</span>
                      <div>
                        <h4 className="plan-title-lg">Thẻ tháng Ô Tô</h4>
                        <span className="plan-badge-pill highlight">Khuyên dùng</span>
                      </div>
                    </div>
                    <div className="plan-price-lg">
                      <strong className="price-num">900.000</strong>
                      <span className="price-unit">VNĐ / tháng</span>
                    </div>
                    <ul className="plan-checklist">
                      <li>✓ Làn xe riêng, barie mở trong 1.2s</li>
                      <li>✓ Tra cứu & giữ chỗ trực tuyến</li>
                      <li>✓ Miễn phí kích bình & bơm lốp tại bãi</li>
                    </ul>
                    <button className="btn-plan-action btn-featured" onClick={onGoToDashboard}>
                      {session ? 'Đăng ký / Gia hạn gói này →' : 'Đăng ký gói Ô Tô ngay'}
                    </button>
                  </div>
                </div>
              )}

              {/* Widget for Tab 4: An ninh & Giám sát */}
              {current.id === 'security' && (
                <div className="stage-widget-card">
                  <div className="widget-card-top">
                    <span className="widget-status-badge">● TIÊU CHUẨN AN TOÀN & BẢO VỆ 24/7</span>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Đạt chuẩn PCCC</span>
                  </div>

                  <div className="security-specs-list">
                    <div className="sec-item">
                      <span className="sec-icon">📹</span>
                      <div>
                        <strong>Camera hồng ngoại ban đêm Full HD</strong>
                        <p>Bao phủ 100% các góc khuất và làn xe, ghi nhận sắc nét trong mọi điều kiện.</p>
                      </div>
                    </div>
                    <div className="sec-item">
                      <span className="sec-icon">🧯</span>
                      <div>
                        <strong>Hệ thống PCCC tự động báo khói</strong>
                        <p>Đầu phun nước và bình bọt hiện đại tự ngắt khi phát hiện nhiệt độ cao bất thường.</p>
                      </div>
                    </div>
                    <div className="sec-item">
                      <span className="sec-icon">👮</span>
                      <div>
                        <strong>Đội tuần tra bảo vệ túc trực 24/7</strong>
                        <p>Hỗ trợ tài xế đưa xe vào vị trí và xử lý sự cố phát sinh tại chỗ.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Widget for Tab 5: Tiện ích & Cứu hộ */}
              {current.id === 'support' && (
                <div className="stage-widget-card">
                  <div className="widget-card-top">
                    <span className="widget-status-badge">● DỊCH VỤ CỨU HỘ TẠI CHỖ MIỄN PHÍ</span>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Hotline 1900 6868</span>
                  </div>

                  <div className="support-features-card">
                    <div className="support-row-highlight">
                      <span className="s-icon">⚡</span>
                      <div>
                        <h4>Kích bình ắc quy tại bãi 24/7</h4>
                        <p>Miễn phí thiết bị kích bình cho khách hàng khi xe không may hết điện.</p>
                      </div>
                    </div>
                    <div className="support-row-highlight">
                      <span className="s-icon">🛞</span>
                      <div>
                        <h4>Trạm bơm lốp điện tử tự ngắt</h4>
                        <p>Đồng hồ kiểm tra áp suất và bổ sung lốp xe nhanh chóng trước khi khởi hành.</p>
                      </div>
                    </div>
                    <div className="support-row-highlight">
                      <span className="s-icon">📞</span>
                      <div>
                        <h4>Tổng đài hỗ trợ 24/7: 1900 6868</h4>
                        <p>Tiếp nhận và giải đáp mọi phản ánh của khách hàng trong tích tắc.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Bottom Status & Info Bar */}
        <footer className="pgr-bottombar-light">
          <div className="bottom-left-info">
            <span className="brand-foot-tag">HT PARKING SYSTEM</span>
            <span className="brand-foot-sep">•</span>
            <span className="brand-foot-text">Giải Pháp Quản Lý Bãi Đỗ Xe Thông Minh Toàn Diện</span>
          </div>
          <div className="bottom-right-info">
            Hỗ trợ 24/7: <strong>1900 6868</strong> • info@htparking.vn
          </div>
        </footer>
      </div>
    </div>
  );
}
