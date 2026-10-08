import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function UserPayment({ session, fetchNotifications }) {
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const paymentBank = import.meta.env.VITE_PAYMENT_BANK;
  const paymentAccount = import.meta.env.VITE_PAYMENT_ACCOUNT;

  useEffect(() => {
    fetchPricing();
    fetchSubscription();
  }, []);

  const fetchPricing = async () => {
    const response = await apiFetch('/api/components/user/UserPayment/pricing');
    if (response.ok) {
      const data = await response.json();
      setPricingConfigs(data);
    }
  };

  const fetchSubscription = async () => {
    const response = await apiFetch(`/api/components/user/UserPayment/subscription/${session.user.id}`);
    if (response.ok) {
      const transaction = await response.json();
      if (transaction) {
        const purchaseDate = new Date(transaction.confirmed_at || transaction.created_at);
        const expiry = new Date(purchaseDate);
        expiry.setDate(expiry.getDate() + 30);
        setExpiryDate(expiry);
      }
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan || isProcessing) return;
    setIsProcessing(true);
    try {
      const response = await apiFetch('/api/components/user/UserPayment/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      if (response.ok) {
        alert('Yêu cầu đã được gửi. Thẻ có hiệu lực sau khi nhân viên xác nhận thanh toán.');
        setSelectedPlan(null);
        fetchNotifications();
        fetchSubscription();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isExpired = expiryDate ? new Date() > expiryDate : true;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THANH TOÁN</p>
          <h1>Mua thẻ đỗ xe<span>.</span></h1>
        </div>
      </div>

      <div className="payment-account">
        <div>
          <h3 className="payment-account-title">Trạng thái tài khoản</h3>
          <p className="payment-account-description">
            {expiryDate ? (
              isExpired ? (
                <span className="payment-expired">Thẻ của bạn đã hết hạn vào ngày {expiryDate.toLocaleDateString()}. Vui lòng gia hạn!</span>
              ) : (
                <span>Thẻ của bạn có hiệu lực đến: <b className="payment-valid">{expiryDate.toLocaleDateString()}</b></span>
              )
            ) : (
              <span className="payment-expired">Bạn chưa mua thẻ đỗ xe. Xe của bạn sẽ không được phép qua cổng.</span>
            )}
          </p>
        </div>
      </div>

      <div className="payment-columns">
        <div className="payment-column">
          <h3 className="payment-section-title">Chọn gói cước</h3>
          <div className="payment-plans">
            {pricingConfigs.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p)}
                className={`payment-plan ${selectedPlan?.id === p.id ? 'is-selected' : 'is-unselected'}`}
>
                <div>
                  <h4 className="payment-plan-title">{p.plan_type}</h4>
                  <p className="payment-plan-description">Gia hạn (30 ngày)</p>
                </div>
                <strong className="payment-price">{p.price.toLocaleString()} đ</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="payment-column">
          <h3 className="payment-section-title">Quét mã thanh toán</h3>
          {selectedPlan ? (
            <div className="payment-checkout">
              {paymentBank && paymentAccount ? <><img
                src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Thanh toan the xe ${session.user.id.substring(0, 8)}`)}`}
                alt="QR Code"
                className="payment-qr"
              />
              <p className="payment-instructions">Quét mã bằng ứng dụng ngân hàng.<br/>Nội dung: <b>Thanh toan the xe {session.user.id.substring(0, 8)}</b></p></>
                : <p>Vui lòng liên hệ nhân viên để được hướng dẫn thanh toán.</p>}
              <p>Thẻ có hiệu lực sau khi nhân viên xác nhận đã nhận tiền.</p>

              <button
                className="primary payment-submit"
                onClick={handlePayment}
                disabled={isProcessing}
>
                {isProcessing ? 'Đang xử lý...' : 'Gửi yêu cầu xác nhận thanh toán'}
              </button>
            </div>
          ) : (
            <div className="payment-placeholder">
              Vui lòng chọn một gói cước bên trái để hiển thị mã QR.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
