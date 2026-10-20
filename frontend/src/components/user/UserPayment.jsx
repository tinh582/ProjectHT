import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function UserPayment({ session, fetchNotifications, onSubscriptionChange }) {
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mode, setMode] = useState('resubscribe'); // 'resubscribe' | 'switch'
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
      }
    } catch (err) {
      console.error('Failed fetching pricing configs:', err);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await apiFetch(`/api/components/user/UserPayment/subscription/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
        onSubscriptionChange?.(data);

        // Pre-select current plan for resubscription if available
        if (data && data.plan_name) {
          // find matching config if available
          setPricingConfigs(prevConfigs => {
            const current = prevConfigs.find(p => p.plan_type === data.plan_name);
            if (current) {
              setSelectedPlan(current);
            }
            return prevConfigs;
          });
        }
      }
    } catch (err) {
      console.error('Failed fetching subscription:', err);
    }
  };

  // Sync selected plan once pricing configs are loaded
  useEffect(() => {
    if (pricingConfigs.length > 0 && subscription?.plan_name && !selectedPlan) {
      const current = pricingConfigs.find(p => p.plan_type === subscription.plan_name);
      if (current) {
        setSelectedPlan(current);
      } else {
        setSelectedPlan(pricingConfigs[0]);
      }
    } else if (pricingConfigs.length > 0 && !selectedPlan) {
      setSelectedPlan(pricingConfigs[0]);
    }
  }, [pricingConfigs, subscription]);

  const handlePayment = async () => {
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
        const actionText = mode === 'resubscribe' ? 'Gia hạn gói cước' : 'Đổi gói cước';
        setNotice({
          type: 'success',
          text: `Yêu cầu ${actionText.toLowerCase()} đã được gửi thành công! Nhân viên bãi xe sẽ đối soát và cập nhật thẻ cho bạn.`
        });
        fetchNotifications?.();
        await fetchSubscription();
      } else {
        const errData = await response.json().catch(() => ({}));
        setNotice({
          type: 'error',
          text: errData.error || 'Gửi yêu cầu thất bại. Vui lòng thử lại.'
        });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
  const isExpired = expiryDate ? new Date() > expiryDate : false;
  const hasPending = Boolean(subscription?.hasPending);

  // Calculate remaining days
  const remainingDays = expiryDate && !isExpired
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Find other plans for switching
  const otherPlans = pricingConfigs.filter(p => p.plan_type !== subscription?.plan_name);

  return (
    <div className="resub-dashboard-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DỊCH VỤ & GÓI CƯỚC</p>
          <h1>Gia hạn & Đổi gói cước<span>.</span></h1>
        </div>
      </div>

      {/* Current Subscription Card */}
      <div className="current-sub-card">
        <div className="current-sub-header">
          <div className="current-sub-title-group">
            <span className="current-sub-badge">GÓI ĐANG SỬ DỤNG</span>
            <h2 className="current-sub-name">{subscription?.plan_name || 'Gói Dịch Vụ HT Parking'}</h2>
          </div>
          <div className="current-sub-status">
            {isExpired ? (
              <span className="badge-expired">● Đã hết hạn</span>
            ) : (
              <span className="badge-active">● Đang hoạt động</span>
            )}
          </div>
        </div>

        <div className="current-sub-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Ngày hết hạn</span>
            <span className="meta-value">
              {expiryDate ? expiryDate.toLocaleDateString('vi-VN') : 'Chưa có thông tin'}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Thời hạn còn lại</span>
            <span className={`meta-value ${remainingDays <= 5 ? 'meta-warn' : 'meta-good'}`}>
              {isExpired ? '0 ngày (Hết hạn)' : `${remainingDays} ngày`}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Giá gói</span>
            <span className="meta-value">
              {subscription?.amount ? `${subscription.amount.toLocaleString()} đ / tháng` : '-'}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Trạng thái xe qua cổng</span>
            <span className="meta-value highlight-green">Tự động nhận diện AI</span>
          </div>
        </div>
      </div>

      {/* Pending Banner */}
      {hasPending && (
        <div className="payment-pending-alert">
          ⏳ <strong>Yêu cầu đang chờ duyệt:</strong> Bạn đã gửi yêu cầu gia hạn / đổi gói cước. Nhân viên bãi xe đang đối soát thanh toán và sẽ cập nhật thời hạn thẻ trong ít phút.
        </div>
      )}

      {/* Notice Message */}
      {notice && (
        <div className={`activation-alert-msg ${notice.type === 'error' ? 'is-error' : 'is-success'}`} style={{ marginBottom: '20px' }}>
          <span>{notice.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{notice.text}</span>
        </div>
      )}

      {/* Resubscription or Switch Plan Navigation Modes */}
      <div className="resub-action-tabs">
        <button
          className={`resub-tab-btn ${mode === 'resubscribe' ? 'active' : ''}`}
          onClick={() => {
            setMode('resubscribe');
            const current = pricingConfigs.find(p => p.plan_type === subscription?.plan_name);
            if (current) setSelectedPlan(current);
          }}
        >
          <span className="resub-tab-icon">🔄</span>
          <div className="resub-tab-text">
            <strong>Gia hạn gói cước hiện tại</strong>
            <span>Gia hạn thêm 30 ngày cho {subscription?.plan_name || 'gói đang dùng'}</span>
          </div>
        </button>

        <button
          className={`resub-tab-btn ${mode === 'switch' ? 'active' : ''}`}
          onClick={() => {
            setMode('switch');
            if (otherPlans.length > 0) setSelectedPlan(otherPlans[0]);
          }}
        >
          <span className="resub-tab-icon">↗</span>
          <div className="resub-tab-text">
            <strong>Đổi gói / Nâng cấp gói khác</strong>
            <span>Chuyển đổi sang gói cao hơn hoặc gói phù hợp phương tiện</span>
          </div>
        </button>
      </div>

      {/* Mode 1: Resubscription */}
      {mode === 'resubscribe' && (
        <div className="payment-columns">
          <div className="payment-column">
            <h3 className="payment-section-title">Thông tin gia hạn gói cước</h3>
            <div className="resub-info-box">
              <div className="resub-badge-highlight">GIA HẠN 30 NGÀY</div>
              <h4>{selectedPlan?.plan_type || subscription?.plan_name || 'Gói cước của bạn'}</h4>
              <p className="resub-desc">
                Thời hạn mới sẽ được <strong>cộng dồn trực tiếp (+30 ngày)</strong> tiếp nối vào ngày hết hạn hiện tại của bạn. Phương tiện tiếp tục được lưu thông tự động qua barie không gián đoạn.
              </p>
              <div className="resub-price-tag">
                <span className="resub-price-val">{selectedPlan?.price?.toLocaleString() || subscription?.amount?.toLocaleString()}</span>
                <span className="resub-price-currency">VNĐ / 30 ngày</span>
              </div>
            </div>
          </div>

          <div className="payment-column">
            <h3 className="payment-section-title">Quét mã QR gia hạn</h3>
            {selectedPlan ? (
              <div className="payment-checkout">
                <img
                  src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Gia han the xe ${session.user.id.substring(0, 8)}`)}`}
                  alt="QR Code"
                  className="payment-qr"
                />
                <p className="payment-instructions">
                  Quét mã bằng app ngân hàng để chuyển khoản nhanh.<br/>
                  Nội dung chuyển khoản: <b>Gia han the xe {session.user.id.substring(0, 8)}</b>
                </p>
                <button
                  className="primary payment-submit"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang gửi yêu cầu...' : '✓ Xác nhận đã chuyển khoản - Gửi yêu cầu gia hạn'}
                </button>
              </div>
            ) : (
              <div className="payment-placeholder">Đang tải thông tin gói cước...</div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Switch to another plan */}
      {mode === 'switch' && (
        <div className="payment-columns">
          <div className="payment-column">
            <h3 className="payment-section-title">Chọn gói muốn chuyển đổi</h3>
            <p className="users-description">
              Chọn gói cước mới bạn muốn áp dụng cho phương tiện của mình:
            </p>
            <div className="payment-plans">
              {pricingConfigs.map(p => {
                const isCurrent = p.plan_type === subscription?.plan_name;
                const isSelected = selectedPlan?.id === p.id;
                const isCar = p.plan_type.toLowerCase().includes('tô');

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    className={`payment-plan ${isSelected ? 'is-selected' : 'is-unselected'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{isCar ? '🚗' : '🛵'}</span>
                        <h4 className="payment-plan-title" style={{ margin: 0 }}>{p.plan_type}</h4>
                        {isCurrent && <span className="switch-current-tag">Gói hiện tại</span>}
                      </div>
                      <p className="payment-plan-description" style={{ marginTop: '4px' }}>
                        Thời hạn: 30 ngày • Nhận diện AI tự động
                      </p>
                    </div>
                    <strong className="payment-price">{p.price.toLocaleString()} đ</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="payment-column">
            <h3 className="payment-section-title">Quét mã QR đổi gói</h3>
            {selectedPlan ? (
              <div className="payment-checkout">
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px', fontSize: '0.88rem' }}>
                  Đang chọn chuyển sang: <strong>{selectedPlan.plan_type}</strong> ({selectedPlan.price.toLocaleString()} đ)
                </div>
                <img
                  src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Doi goi the xe ${session.user.id.substring(0, 8)}`)}`}
                  alt="QR Code"
                  className="payment-qr"
                />
                <p className="payment-instructions">
                  Quét mã bằng app ngân hàng để chuyển khoản.<br/>
                  Nội dung chuyển khoản: <b>Doi goi the xe {session.user.id.substring(0, 8)}</b>
                </p>
                <button
                  className="primary payment-submit"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Đang gửi yêu cầu...' : `✓ Xác nhận chuyển khoản - Đổi sang ${selectedPlan.plan_type}`}
                </button>
              </div>
            ) : (
              <div className="payment-placeholder">Vui lòng chọn một gói cước để xem thông tin chuyển khoản.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
