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

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 5px' }}>Trạng thái tài khoản</h3>
          <p style={{ margin: 0, color: '#666' }}>
            {expiryDate ? (
              isExpired ? (
                <span style={{ color: 'red' }}>Thẻ của bạn đã hết hạn vào ngày {expiryDate.toLocaleDateString()}. Vui lòng gia hạn!</span>
              ) : (
                <span>Thẻ của bạn có hiệu lực đến: <b style={{ color: 'green' }}>{expiryDate.toLocaleDateString()}</b></span>
              )
            ) : (
              <span style={{ color: 'red' }}>Bạn chưa mua thẻ đỗ xe. Xe của bạn sẽ không được phép qua cổng.</span>
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Chọn gói cước</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {pricingConfigs.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPlan(p)}
                style={{ 
                  padding: '20px', 
                  border: selectedPlan?.id === p.id ? '2px solid #2a5340' : '1px solid #eaeaea',
                  borderRadius: '12px',
                  background: selectedPlan?.id === p.id ? '#f2f8f4' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 5px' }}>{p.plan_type}</h4>
                  <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>Gia hạn (30 ngày)</p>
                </div>
                <strong style={{ fontSize: '18px', color: '#2a5340' }}>{p.price.toLocaleString()} đ</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Quét mã thanh toán</h3>
          {selectedPlan ? (
            <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #eaeaea', textAlign: 'center' }}>
              {paymentBank && paymentAccount ? <><img
                src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Thanh toan the xe ${session.user.id.substring(0, 8)}`)}`}
                alt="QR Code" 
                style={{ width: '250px', height: '250px', margin: '0 auto', display: 'block' }} 
              />
              <p style={{ marginTop: '20px', color: '#666' }}>Quét mã bằng ứng dụng ngân hàng.<br/>Nội dung: <b>Thanh toan the xe {session.user.id.substring(0, 8)}</b></p></>
                : <p>Vui lòng liên hệ nhân viên để được hướng dẫn thanh toán.</p>}
              <p>Thẻ có hiệu lực sau khi nhân viên xác nhận đã nhận tiền.</p>
              
              <button 
                className="primary" 
                onClick={handlePayment} 
                disabled={isProcessing}
                style={{ width: '100%', marginTop: '15px', padding: '15px' }}
              >
                {isProcessing ? 'Đang xử lý...' : 'Gửi yêu cầu xác nhận thanh toán'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#fafafa', padding: '50px', borderRadius: '12px', border: '1px dashed #ccc', textAlign: 'center', color: '#888' }}>
              Vui lòng chọn một gói cước bên trái để hiển thị mã QR.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
