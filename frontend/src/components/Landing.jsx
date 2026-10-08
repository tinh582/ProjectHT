import React from 'react';

export default function Landing({ onSwitchToLogin, onSwitchToRegister }) {
  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">HT<span> PARKING</span></div>
        <div className="landing-nav-links">
          <button className="nav-btn-outline" onClick={onSwitchToLogin}>Đăng nhập</button>
          <button className="nav-btn-solid" onClick={onSwitchToRegister}>Đăng ký</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Giải Pháp Đỗ Xe Thông Minh<br/>Của Tương Lai</h1>
          <p className="hero-subtitle">Trải nghiệm dịch vụ bãi đỗ xe an toàn, tiện lợi với công nghệ AI tự động. Quản lý chỗ đỗ, thanh toán mượt mà chỉ với vài cú chạm.</p>
          <div className="hero-actions">
            <button className="cta-btn primary-cta" onClick={onSwitchToRegister}>Bắt đầu ngay</button>
            <button className="cta-btn secondary-cta" onClick={onSwitchToLogin}>Đã có tài khoản?</button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="landing-features">
        <div className="section-header">
          <h2>Tại sao chọn HT Parking?</h2>
          <p>Hệ thống được thiết kế để mang lại trải nghiệm tối ưu nhất cho khách hàng.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚙</div>
            <h3>Đặt chỗ thông minh</h3>
            <p>Xác định và giữ chỗ đỗ tự động qua sơ đồ trực quan. Không còn nỗi lo thiếu chỗ khi đến nơi.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Thanh toán 1 chạm</h3>
            <p>Hỗ trợ đa dạng phương thức thanh toán. Mua vé tháng nhanh chóng, gia hạn tự động siêu tiện lợi.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Giám sát an ninh 24/7</h3>
            <p>Hệ thống camera AI nhận diện biển số xe tự động, bảo vệ phương tiện của bạn tuyệt đối an toàn.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 HT Parking. Nền tảng quản lý bãi đỗ xe hàng đầu.</p>
      </footer>
    </div>
  );
}
