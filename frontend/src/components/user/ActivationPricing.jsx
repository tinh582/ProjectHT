import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function ActivationPricing({ session, onBackToLanding, onUnlocked, onLogout }) {
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  const paymentBank = import.meta.env.VITE_PAYMENT_BANK || 'BIDV';
  const paymentAccount = import.meta.env.VITE_PAYMENT_ACCOUNT || '6261378455';

  useEffect(() => {
    fetchPricing();
    fetchSubscription();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await apiFetch('/api/components/user/UserPayment/pricing');
      if (response.ok) {
        const data = await response.json();
        setPricingConfigs(data);
        if (data.length > 0 && !selectedPlan) {
          setSelectedPlan(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed fetching pricing configs:', err);
    }
  };

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/components/user/UserPayment/subscription/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
        if (data.isActive) {
          // If already active, trigger unlock
          onUnlocked?.();
        }
      }
    } catch (err) {
      console.error('Failed fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!selectedPlan || isProcessing) return;
    setIsProcessing(true);
    setNotice(null);

    try {
      const response = await apiFetch('/api/components/user/UserPayment/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });

      if (response.ok) {
        setNotice({
          type: 'success',
          text: 'Yêu cầu thanh toán kích hoạt đã được gửi thành công! Nhân viên bãi xe sẽ xác nhận đối soát và tự động mở khóa Bảng điều khiển cho bạn.'
        });
        await fetchSubscription();
      } else {
        const errData = await response.json().catch(() => ({}));
        setNotice({
          type: 'error',
          text: errData.error || 'Gửi yêu cầu thanh toán không thành công. Vui lòng thử lại.'
        });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPending = Boolean(subscription?.hasPending);
  const isActive = Boolean(subscription?.isActive);

  return (
    <div className="activation-page">
      {/* Top Header */}
      <header className="activation-header">
        <div className="activation-brand" onClick={onBackToLanding} role="button" tabIndex={0}>
          <span className="activation-logo-ht">HT</span>
          <span className="activation-logo-park">PARKING</span>
          <span className="activation-tag">KÍCH HOẠT DỊCH VỤ</span>
        </div>
        <div className="activation-user-nav">
          <div className="activation-user-pill">
            <span className="activation-user-icon">👤</span>
            <span className="activation-user-email">{session.user.email}</span>
            <span className="activation-user-role">Khách hàng</span>
          </div>
          <button className="activation-btn-secondary" onClick={onBackToLanding}>
            ← Quay lại Trang chủ
          </button>
          <button className="activation-btn-logout" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="activation-container">
        {/* Gateway Alert Box */}
        <div className="activation-gate-banner">
          <div className="activation-gate-icon">🔒</div>
          <div className="activation-gate-body">
            <h2>Kích hoạt quyền truy cập Bảng điều khiển</h2>
            <p>
              Tài khoản của bạn hiện <strong>chưa kích hoạt gói dịch vụ</strong>. Vui lòng chọn một gói cước phù hợp bên dưới và thanh toán để mở khóa toàn bộ tính năng quản lý phương tiện, sơ đồ bãi đỗ và lịch sử ra vào.
            </p>
          </div>
        </div>

        {/* Pending Banner if transaction is awaiting confirmation */}
        {hasPending && (
          <div className="activation-pending-card">
            <div className="pending-badge">⏳ ĐANG CHỜ NHÂN VIÊN ĐỐI SOÁT</div>
            <h3>Yêu cầu kích hoạt của bạn đã được tiếp nhận</h3>
            <p>
              Hệ thống đã ghi nhận yêu cầu đăng ký gói cước của bạn. Nhân viên bãi đỗ xe đang kiểm tra giao dịch chuyển khoản. Sau khi xác nhận tiền về tài khoản, Bảng điều khiển sẽ tự động mở khóa ngay lập tức!
            </p>
            <button className="activation-btn-refresh" onClick={fetchSubscription} disabled={loading}>
              {loading ? 'Đang kiểm tra...' : '🔄 Kiểm tra lại trạng thái'}
            </button>
          </div>
        )}

        {/* Notice Message */}
        {notice && (
          <div className={`activation-alert-msg ${notice.type === 'error' ? 'is-error' : 'is-success'}`}>
            <span>{notice.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{notice.text}</span>
          </div>
        )}

        {/* If already active, show celebratory unlock button */}
        {isActive && (
          <div className="activation-unlocked-card">
            <div className="unlocked-icon">🎉</div>
            <h3>Gói cước của bạn đã được kích hoạt thành công!</h3>
            <p>Tài khoản đã sẵn sàng để quản lý phương tiện và theo dõi bãi đỗ xe.</p>
            <button className="activation-btn-enter" onClick={onUnlocked}>
              Truy cập Bảng điều khiển ngay →
            </button>
          </div>
        )}

        {/* Pricing Selection & QR Checkout Grid */}
        <div className="activation-content-grid">
          {/* Column 1: Plan Selection */}
          <div className="activation-plans-panel">
            <div className="panel-title-row">
              <h3>1. Chọn gói cước đỗ xe</h3>
              <span className="panel-hint">Tiết kiệm & An tâm mỗi ngày</span>
            </div>

            <div className="activation-plans-list">
              {pricingConfigs.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                const isMoto = plan.plan_type.toLowerCase().includes('máy');

                return (
                  <div
                    key={plan.id}
                    className={`activation-plan-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlan(plan)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="plan-card-header">
                      <div className="plan-icon">{isMoto ? '🛵' : '🚗'}</div>
                      <div className="plan-meta">
                        <h4 className="plan-name">{plan.plan_type}</h4>
                        <span className="plan-period">Thời hạn sử dụng: 30 Ngày</span>
                      </div>
                      <div className="plan-radio">
                        <div className={`radio-dot ${isSelected ? 'checked' : ''}`}></div>
                      </div>
                    </div>

                    <div className="plan-price-row">
                      <span className="plan-price-num">{plan.price.toLocaleString()}</span>
                      <span className="plan-price-unit">VNĐ / tháng</span>
                    </div>

                    <ul className="plan-perks">
                      <li>✓ Tự động nhận diện biển số AI qua cổng</li>
                      <li>✓ Không cần thẻ từ - Ra vào nhanh chóng</li>
                      <li>✓ Tra cứu ô trống & bảo vệ phương tiện 24/7</li>
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: VietQR Checkout */}
          <div className="activation-payment-panel">
            <div className="panel-title-row">
              <h3>2. Quét mã VietQR thanh toán</h3>
              <span className="panel-hint">Chuyển khoản 24/7 qua app ngân hàng</span>
            </div>

            {selectedPlan ? (
              <div className="activation-checkout-card">
                <div className="checkout-summary">
                  <span className="checkout-label">Gói đang chọn:</span>
                  <span className="checkout-value">{selectedPlan.plan_type}</span>
                  <span className="checkout-price">{selectedPlan.price.toLocaleString()} VNĐ</span>
                </div>

                <div className="qr-container">
                  <img
                    src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Thanh toan the xe ${session.user.id.substring(0, 8)}`)}`}
                    alt="VietQR Code"
                    className="activation-qr-image"
                  />
                  <div className="qr-instruction">
                    <p>Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ để quét mã QR thanh toán tức thì.</p>
                  </div>
                </div>

                <div className="bank-info-table">
                  <div className="bank-row">
                    <span className="bank-lbl">Ngân hàng:</span>
                    <span className="bank-val font-semibold">{paymentBank} (Ngân hàng Đầu tư và Phát triển VN)</span>
                  </div>
                  <div className="bank-row">
                    <span className="bank-lbl">Số tài khoản:</span>
                    <span className="bank-val font-mono">{paymentAccount}</span>
                  </div>
                  <div className="bank-row">
                    <span className="bank-lbl">Chủ tài khoản:</span>
                    <span className="bank-val">HT PARKING SERVICES</span>
                  </div>
                  <div className="bank-row">
                    <span className="bank-lbl">Số tiền:</span>
                    <span className="bank-val highlight">{selectedPlan.price.toLocaleString()} đ</span>
                  </div>
                  <div className="bank-row">
                    <span className="bank-lbl">Nội dung CK:</span>
                    <span className="bank-val font-mono memo">Thanh toan the xe {session.user.id.substring(0, 8)}</span>
                  </div>
                </div>

                <button
                  className="activation-btn-submit"
                  onClick={handlePay}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang gửi yêu cầu...' : '✓ Xác nhận đã chuyển khoản - Kích hoạt ngay'}
                </button>
                <p className="activation-subtext">
                  Bảng điều khiển sẽ được mở khóa ngay sau khi nhân viên bãi xe xác nhận tiền vào tài khoản.
                </p>
              </div>
            ) : (
              <div className="activation-placeholder-card">
                <p>Vui lòng chọn một gói cước bên trái để hiển thị thông tin chuyển khoản và mã QR.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
