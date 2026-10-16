import React, { useState } from 'react';

export default function Landing({ onSwitchToLogin, onSwitchToRegister }) {
  const [activeTab, setActiveTab] = useState(0);

  const menuItems = [
    {
      id: 'home',
      menuTitle: 'TRANG CHỦ',
      badge: 'HỆ THỐNG QUẢN LÝ BÃI ĐỖ XE THÔNG MINH',
      headline: 'ĐỖ XE THÔNG MINH, AN TÂM MỌI HÀNH TRÌNH',
      description: 'HT Parking mang đến giải pháp đỗ xe thông minh toàn diện với công nghệ nhận diện biển số tự động, kiểm tra ô trống theo thời gian thực và thanh toán không tiền mặt thuận tiện. Tối ưu thời gian, nâng tầm trải nghiệm của bạn.',
      highlights: [
        { label: 'Thời gian qua trạm', value: '< 2 Giây' },
        { label: 'Hình thức thanh toán', value: 'Quét mã VietQR' },
        { label: 'Giám sát an ninh', value: '24/7/365' }
      ],
      features: [
        {
          title: 'Nhận diện biển số tự động',
          desc: 'Barie tự động nhấc khi phát hiện xe đúng dữ liệu, lưu thông nhanh gọn và không cần dùng thẻ từ.'
        },
        {
          title: 'Kiểm tra ô trống trực tiếp',
          desc: 'Chủ động tra cứu số lượng chỗ còn trống theo từng khu vực trước khi xuất phát đến nơi.'
        },
        {
          title: 'Gói vé tháng tiết kiệm',
          desc: 'Tiết kiệm chi phí đáng kể cho cư dân và nhân viên làm việc thường xuyên tại khu vực.'
        },
        {
          title: 'An ninh giám sát đa tầng',
          desc: 'Hệ thống camera hồng ngoại bao phủ toàn bộ lối đi kết hợp đội ngũ bảo vệ túc trực thường xuyên.'
        }
      ]
    },
    {
      id: 'ai-plate',
      menuTitle: 'NHẬN DIỆN BIỂN SỐ',
      badge: 'CÔNG NGHỆ CAMERA AI TỰ ĐỘNG',
      headline: 'RA VÀO NHANH CHÓNG, KHÔNG LO MẤT THẺ',
      description: 'Hệ thống camera độ nét cao tự động nhận diện biển số phương tiện ngay khi xe tiến vào làn kiểm soát. Không cần dừng xe bấm thẻ, loại bỏ hoàn toàn phiền toái rơi thẻ hay ùn tắc vào giờ cao điểm.',
      highlights: [
        { label: 'Tốc độ mở barie', value: '1.5 Giây' },
        { label: 'Độ chuẩn xác', value: '99.8%' },
        { label: 'Thao tác thủ công', value: '0 Thẻ từ' }
      ],
      features: [
        {
          title: 'Lưu thông siêu tốc',
          desc: 'Barie tự động mở ngay tức thì, xe chỉ cần di chuyển với vận tốc chậm qua trạm mà không phải dừng lại lâu.'
        },
        {
          title: 'Loại bỏ hoàn toàn thẻ từ',
          desc: 'Không còn nỗi lo làm rơi, thất lạc hoặc gãy hỏng thẻ xe gửi truyền thống.'
        },
        {
          title: 'Ghi nhận thời gian minh bạch',
          desc: 'Thời gian vào - ra được hệ thống ghi nhận chính xác từng giây, tính phí minh bạch công khai.'
        },
        {
          title: 'Đồng bộ tài khoản di động',
          desc: 'Theo dõi lịch sử ra vào và nhận thông báo xe qua trạm tức thì trên điện thoại của bạn.'
        }
      ]
    },
    {
      id: 'booking',
      menuTitle: 'ĐẶT CHỖ & SỨC CHỨA',
      badge: 'CHỦ ĐỘNG LỘ TRÌNH & VỊ TRÍ',
      headline: 'TRA CỨU Ô TRỐNG & GIỮ CHỖ THUẬN TIỆN',
      description: 'Dễ dàng tra cứu số lượng vị trí đỗ còn trống theo thời gian thực trước khi bạn tới nơi. Tính năng giữ chỗ trước giúp bạn luôn có điểm đỗ thuận tiện ngay cả trong những khung giờ cao điểm nhất.',
      highlights: [
        { label: 'Cập nhật tình trạng', value: 'Thời gian thực' },
        { label: 'Quy trình đặt chỗ', value: '3 Bước đơn giản' },
        { label: 'Phân luồng phương tiện', value: 'Làn xe khoa học' }
      ],
      features: [
        {
          title: 'Nắm bắt ô trống trực tiếp',
          desc: 'Xem trước tình trạng bãi xe trước khi xuất phát để chủ động lựa chọn điểm đỗ hợp lý.'
        },
        {
          title: 'Đặt giữ chỗ trước khi đến',
          desc: 'Đảm bảo chắc chắn vị trí đậu xe cho các cuộc hẹn quan trọng hay sự kiện lớn.'
        },
        {
          title: 'Lối đi rộng rãi, thông thoáng',
          desc: 'Thiết kế làn xe đạt chuẩn, biển chỉ dẫn rõ ràng giúp di chuyển và quay đầu xe dễ dàng.'
        },
        {
          title: 'Chỉ dẫn vị trí ô đỗ',
          desc: 'Sơ đồ và biển báo trực quan giúp bạn nhanh chóng tìm đến đúng khu vực đỗ xe.'
        }
      ]
    },
    {
      id: 'payment',
      menuTitle: 'VÉ THÁNG & THANH TOÁN',
      badge: 'THANH TOÁN TIỆN LỢI & TIẾT KIỆM',
      headline: 'QUÉT MÃ QR NHANH GỌN, VÉ THÁNG ƯU ĐÃI',
      description: 'Thanh toán phí gửi xe dễ dàng chỉ bằng một thao tác quét mã QR ngân hàng hoặc ví điện tử. Khách hàng gửi thường xuyên có thể đăng ký gói vé tháng để tiết kiệm chi phí tối đa.',
      highlights: [
        { label: 'Hình thức thanh toán', value: 'VietQR / Ví điện tử' },
        { label: 'Gói vé tháng', value: 'Tiết kiệm đến 30%' },
        { label: 'Gia hạn trực tuyến', value: 'Không cần xếp hàng' }
      ],
      features: [
        {
          title: 'Quét mã VietQR tiện lợi',
          desc: 'Hỗ trợ quét mã thanh toán từ mọi ứng dụng ngân hàng và ví điện tử phổ biến tại Việt Nam.'
        },
        {
          title: 'Gói cước tháng ưu đãi',
          desc: 'Chi phí tối ưu dành cho cư dân chung cư và nhân viên tòa nhà gửi xe theo tháng.'
        },
        {
          title: 'Đối soát chi phí minh bạch',
          desc: 'Dễ dàng tra cứu lại chi tiết lịch sử từng lượt gửi và giao dịch thanh toán trên ứng dụng.'
        },
        {
          title: 'Đăng ký vé tháng trực tuyến',
          desc: 'Thực hiện thủ tục đăng ký và gia hạn vé tháng ngay trên website hoặc điện thoại trong vài phút.'
        }
      ]
    },
    {
      id: 'security',
      menuTitle: 'AN NINH & GIÁM SÁT',
      badge: 'BẢO VỆ PHƯƠNG TIỆN TOÀN DIỆN',
      headline: 'GIÁM SÁT CAMERA 24/7, AN TÂM TUYỆT ĐỐI',
      description: 'Phương tiện của bạn luôn được bảo vệ tối đa nhờ hệ thống camera an ninh độ nét cao bao phủ toàn bộ bãi đỗ cùng đội ngũ bảo vệ túc trực tuần tra liên tục cả ngày lẫn đêm.',
      highlights: [
        { label: 'Thời gian giám sát', value: '24/7/365' },
        { label: 'Hệ thống an toàn', value: 'PCCC Đạt Chuẩn' },
        { label: 'Đội ngũ trực chốt', value: 'Túc trực liên tục' }
      ],
      features: [
        {
          title: 'Camera hồng ngoại 24/7',
          desc: 'Ghi hình liên tục với chất lượng rõ nét ngay cả trong hầm đỗ xe và điều kiện thiếu sáng.'
        },
        {
          title: 'Kiểm soát phương tiện chặt chẽ',
          desc: 'Hệ thống chỉ cho phép xe rời bãi khi biển số và thời gian trùng khớp với dữ liệu đăng ký.'
        },
        {
          title: 'Phòng cháy chữa cháy chuẩn mực',
          desc: 'Trang bị hệ thống báo khói, vòi chữa cháy tự động và lối thoát hiểm thông thoáng, an toàn.'
        },
        {
          title: 'Nhân viên bảo vệ thường trực',
          desc: 'Đội ngũ bảo vệ hỗ trợ kiểm soát trật tự và xử lý tình huống phát sinh ngay tại chỗ.'
        }
      ]
    },
    {
      id: 'support',
      menuTitle: 'TIỆN ÍCH & CỨU HỘ',
      badge: 'DỊCH VỤ TẬN TÂM & CHU ĐÁO',
      headline: 'ĐỒNG HÀNH VÀ HỖ TRỢ TÀI XẾ MỌI LÚC',
      description: 'Chúng tôi chú trọng từng trải nghiệm của khách hàng: hỗ trợ kích bình ắc quy khi xe gặp sự cố, trạm bơm lốp tự động miễn phí và tổng đài chăm sóc khách hàng luôn sẵn sàng phục vụ.',
      highlights: [
        { label: 'Hotline hỗ trợ', value: '1900 6868' },
        { label: 'Cứu hộ tại chỗ', value: 'Kích bình & Bơm lốp' },
        { label: 'Thái độ phục vụ', value: 'Tận tâm, chu đáo' }
      ],
      features: [
        {
          title: 'Hỗ trợ kích bình ắc quy',
          desc: 'Sẵn sàng thiết bị kích bình hỗ trợ miễn phí khi xe của bạn không may hết điện tại bãi.'
        },
        {
          title: 'Trạm bơm lốp miễn phí',
          desc: 'Trang bị máy bơm lốp điện tử tiện dụng để bạn kiểm tra và bổ sung áp suất lốp trước khi khởi hành.'
        },
        {
          title: 'Hướng dẫn làn đường đỗ xe',
          desc: 'Nhân viên bãi xe luôn sẵn lòng hỗ trợ bạn tìm vị trí và thao tác đỗ xe thuận tiện nhất.'
        },
        {
          title: 'Tổng đài tiếp nhận 24/7',
          desc: 'Đường dây nóng luôn trực để lắng nghe và giải đáp mọi thắc mắc hay phản ánh của khách hàng.'
        }
      ]
    }
  ];

  const current = menuItems[activeTab];

  return (
    <div className="pgr-landing">
      {/* LEFT NAVIGATION RAIL (Inspired by Punishing Gray Raven Menu Bar) */}
      <div className="pgr-left-rail">
        {/* Brand / Logo at top-left */}
        <div className="pgr-brand">
          <div className="pgr-brand-title">
            HT<span className="pgr-brand-accent">PARKING</span>
          </div>
          <div className="pgr-brand-sub">SMART MOBILITY SYSTEM</div>
          <div className="pgr-menu-icon" title="Menu">
            <span className="pgr-line"></span>
            <span className="pgr-line"></span>
            <span className="pgr-line"></span>
          </div>
        </div>

        {/* Clean Vertical Left Menu */}
        <nav className="pgr-menu-nav" role="tablist">
          {menuItems.map((item, index) => {
            const isActive = activeTab === index;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                className={`pgr-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(index)}
                id={`pgr-tab-${item.id}`}
              >
                <span className="pgr-active-indicator"></span>
                <span className="pgr-menu-text">{item.menuTitle}</span>
              </button>
            );
          })}
        </nav>

        {/* Technical/Status Footnote at bottom-left */}
        <div className="pgr-rail-footer">
          <div className="pgr-status-indicator">
            <span className="pgr-status-dot"></span>
            <span className="pgr-status-text">HỆ THỐNG TRỰC TUYẾN</span>
          </div>
          <div className="pgr-system-code">[HT-SYS v2.4] • HOTLINE: 1900 6868</div>
        </div>
      </div>

      {/* MAIN DISPLAY AREA (Center & Right Showcase) */}
      <div className="pgr-main-stage">
        {/* Top Header Bar */}
        <header className="pgr-topbar">
          <div className="pgr-tagline">
            Bãi đỗ xe thông minh • An toàn tuyệt đối • Tiết kiệm thời gian
          </div>
          <div className="pgr-auth-buttons">
            <button className="pgr-btn-login" onClick={onSwitchToLogin} id="landing-login-btn">
              Đăng nhập
            </button>
            <button className="pgr-btn-register" onClick={onSwitchToRegister} id="landing-register-btn">
              Đăng ký tài khoản
            </button>
          </div>
        </header>

        {/* Dynamic Content Card / Hero Display */}
        <main className="pgr-content-stage" key={current.id}>
          <div className="pgr-hero-card">
            {/* Category / Badge */}
            <div className="pgr-badge-wrapper">
              <span className="pgr-badge">{current.badge}</span>
            </div>

            {/* Impactful Title */}
            <h1 className="pgr-headline">{current.headline}</h1>

            {/* Realistic, Grounded Description */}
            <p className="pgr-description">{current.description}</p>

            {/* Quality Metrics / Highlights Strip */}
            <div className="pgr-metrics-strip">
              {current.highlights.map((h, i) => (
                <div key={i} className="pgr-metric-box">
                  <div className="pgr-metric-value">{h.value}</div>
                  <div className="pgr-metric-label">{h.label}</div>
                </div>
              ))}
            </div>

            {/* Feature Quality Cards Grid */}
            <div className="pgr-features-grid">
              {current.features.map((feat, i) => (
                <div key={i} className="pgr-feat-card">
                  <div className="pgr-feat-check">✓</div>
                  <div className="pgr-feat-content">
                    <h3 className="pgr-feat-title">{feat.title}</h3>
                    <p className="pgr-feat-desc">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pgr-cta-row">
              <button className="pgr-btn-primary" onClick={onSwitchToRegister} id="content-register-cta">
                Đăng ký trải nghiệm ngay
              </button>
              <button className="pgr-btn-secondary" onClick={onSwitchToLogin} id="content-login-cta">
                Đăng nhập tài khoản
              </button>
            </div>
          </div>
        </main>

        {/* Bottom Bar: Clean and minimal without cluttered badges */}
        <footer className="pgr-bottombar">
          <div className="pgr-bottom-left">
            <span className="pgr-foot-tag">HT PARKING SYSTEM</span>
            <span className="pgr-foot-sep">•</span>
            <span className="pgr-foot-update">Giải Pháp Quản Lý Bãi Đỗ Xe Thông Minh Toàn Diện</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
