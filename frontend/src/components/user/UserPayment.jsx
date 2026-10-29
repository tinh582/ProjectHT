import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import SlotPreviewModal from './SlotPreviewModal';
import VehicleDialog from './VehicleDialog';

export default function UserPayment({ session, fetchNotifications, onSubscriptionChange }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mode, setMode] = useState('resubscribe'); // 'resubscribe' | 'switch'
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  // Slot preview & OCR Payment Proof
  const [showSlotPreview, setShowSlotPreview] = useState(false);
  const [chosenSlot, setChosenSlot] = useState(null);
  const [proofImage, setProofImage] = useState(null);

  const paymentBank = import.meta.env.VITE_PAYMENT_BANK || 'BIDV';
  const paymentAccount = import.meta.env.VITE_PAYMENT_ACCOUNT || '6261378455';

  useEffect(() => {
    fetchUserVehicles();
    fetchPricing();
    fetchSubscription();
  }, []);

  const fetchUserVehicles = async (autoSelectPlate = null) => {
    try {
      const response = await apiFetch(`/api/components/user/Dashboard/vehicles/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        const list = data.vehicles || [];
        setVehicles(list);
        if (autoSelectPlate) {
          const found = list.find(v => v.plate === autoSelectPlate);
          if (found) {
            handleSelectVehicle(found);
            return;
          }
        }
        if (list.length > 0 && !selectedVehicle) {
          handleSelectVehicle(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed fetching user vehicles:', err);
    }
  };

  const handleSelectVehicle = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setChosenSlot(null);
    if (!vehicle?.type) return;
    try {
      const res = await apiFetch(`/api/components/user/UserSlotPicker/${encodeURIComponent(vehicle.type)}`);
      if (res.ok) {
        const allSlots = await res.json();
        const existing = (allSlots || []).find(s => s.vehicle_id === vehicle.id);
        if (existing) {
          setChosenSlot(existing);
        }
      }
    } catch (err) {
      console.error('Failed checking vehicle slot:', err);
    }
  };

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

        if (data && data.plan_name) {
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

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh biên lai chuyển khoản nhỏ hơn 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePayment = async () => {
    if (!selectedVehicle) {
      setNotice({ type: 'error', text: 'Bước 1: Vui lòng chọn phương tiện của bạn trước.' });
      return;
    }
    if (!chosenSlot) {
      setNotice({ type: 'error', text: 'Bước 2: Vui lòng chọn vị trí đỗ cố định cho xe trước khi thanh toán.' });
      return;
    }
    if (!selectedPlan || isProcessing) return;
    setIsProcessing(true);
    setNotice(null);

    try {
      const response = await apiFetch('/api/components/user/UserPayment/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          vehicleId: selectedVehicle.id,
          selectedSlotId: chosenSlot.id,
          proofImage,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (response.ok) {
        if (resData.autoVerified) {
          setNotice({
            type: 'success',
            text: '🎉 Hệ thống AI đã nhận diện chứng từ thành công & tự động kích hoạt gói cước!'
          });
        } else {
          setNotice({
            type: 'success',
            text: `Yêu cầu thanh toán cho xe ${selectedVehicle.plate} (Ô ${chosenSlot.slot_name}) đã được gửi thành công! Nhân viên bãi xe sẽ đối soát và kích hoạt thẻ cho bạn.`
          });
        }
        setProofImage(null);
        fetchNotifications?.();
        await fetchSubscription();
      } else {
        setNotice({
          type: 'error',
          text: resData.error || 'Gửi yêu cầu thất bại. Vui lòng thử lại.'
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

  const remainingDays = expiryDate && !isExpired
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const otherPlans = pricingConfigs.filter(p => p.plan_type !== subscription?.plan_name);
  const canPay = Boolean(selectedVehicle && chosenSlot && selectedPlan);

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
          <div className="meta-item">
            <span className="meta-label">Chu kỳ thuê gói</span>
            <span className="meta-value" style={{ fontSize: '12px' }}>
              {subscription?.cycle_start ? `${new Date(subscription.cycle_start).toLocaleDateString('vi-VN')} - ${new Date(subscription.cycle_end).toLocaleDateString('vi-VN')}` : (expiryDate ? `Đến ${expiryDate.toLocaleDateString('vi-VN')}` : '-')}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Ngày hệ thống duyệt</span>
            <span className="meta-value" style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              {subscription?.confirmed_at ? new Date(subscription.confirmed_at).toLocaleDateString('vi-VN') : 'Đang đối soát'}
            </span>
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

      {/* =========================================================
          MANDATORY STEP 1 & STEP 2 BEFORE PAYMENT
         ========================================================= */}
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
          Quy trình bắt buộc trước khi Thanh toán: (1) Chọn Xe → (2) Chọn Vị trí đỗ → (3) Thanh toán
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Step 1: Vehicle */}
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: selectedVehicle ? '2px solid #10b981' : '2px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Bước 1: Chọn phương tiện</strong>
              <button type="button" className="secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setShowAddVehicleModal(true)}>
                ＋ Thêm xe
              </button>
            </div>
            {vehicles.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Bạn chưa có phương tiện nào. Hãy nhấn "+ Thêm xe" trước.</p>
            ) : (
              <select
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  const v = vehicles.find(item => String(item.id) === e.target.value);
                  if (v) handleSelectVehicle(v);
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.type} ({v.brand} {v.model})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Parking Slot */}
          <div style={{
            padding: '14px', borderRadius: '10px', background: '#f8fafc',
            border: chosenSlot ? '2px solid #10b981' : selectedVehicle ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            opacity: selectedVehicle ? 1 : 0.6
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Bước 2: Vị trí đỗ cố định (1 Slot = 1 Xe)</strong>
              <button
                type="button"
                className="primary"
                disabled={!selectedVehicle}
                onClick={() => setShowSlotPreview(true)}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                {chosenSlot ? 'Đổi vị trí đỗ' : 'Chọn vị trí đỗ →'}
              </button>
            </div>
            <div style={{ fontSize: '13px', color: chosenSlot ? '#065f46' : '#64748b', fontWeight: chosenSlot ? 700 : 400 }}>
              {chosenSlot
                ? `✓ Đã chọn ô đỗ: ${chosenSlot.slot_name} (Gắn với xe ${selectedVehicle?.plate})`
                : '⚠️ Bắt buộc chọn một vị trí đỗ còn trống trên sơ đồ trước khi thanh toán'}
            </div>
          </div>
        </div>
      </div>

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

      {!canPay ? (
        <div style={{
          padding: '28px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#475569'
        }}>
          🔒 <strong>Bước 3 (Thanh toán) đang khóa:</strong> Vui lòng chọn <strong>Phương tiện (Bước 1)</strong> và <strong>Vị trí đỗ cố định (Bước 2)</strong> ở khung phía trên để hiển thị mã QR thanh toán.
        </div>
      ) : (
        <>
          {/* Mode 1: Resubscription */}
          {mode === 'resubscribe' && (
            <div className="payment-columns">
              <div className="payment-column">
                <h3 className="payment-section-title">Thông tin gia hạn gói cước</h3>
                <div className="resub-info-box">
                  <div className="resub-badge-highlight">GIA HẠN 30 NGÀY</div>
                  <h4>{selectedPlan?.plan_type || subscription?.plan_name || 'Gói cước của bạn'}</h4>
                  <p className="resub-desc">
                    Áp dụng cho xe <strong>{selectedVehicle.plate}</strong> tại vị trí đỗ cố định <strong>Ô {chosenSlot.slot_name}</strong>.
                    Thời hạn mới sẽ được <strong>cộng dồn trực tiếp (+30 ngày)</strong>.
                  </p>
                  <div className="resub-price-tag">
                    <span className="resub-price-val">{selectedPlan?.price?.toLocaleString() || subscription?.amount?.toLocaleString()}</span>
                    <span className="resub-price-currency">VNĐ / 30 ngày</span>
                  </div>
                </div>
              </div>

              <div className="payment-column">
                <h3 className="payment-section-title">Bước 3: Quét mã QR gia hạn</h3>
                {selectedPlan ? (
                  <div className="payment-checkout">
                    <img
                      src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Gia han ${selectedVehicle.plate} ${session.user.id.substring(0, 8)}`)}`}
                      alt="QR Code"
                      className="payment-qr"
                    />
                    <p className="payment-instructions">
                      Quét mã bằng app ngân hàng để chuyển khoản nhanh.<br/>
                      Nội dung chuyển khoản: <b>Gia han {selectedVehicle.plate} {session.user.id.substring(0, 8)}</b>
                    </p>

                    {/* OCR AI Proof Upload */}
                    <div style={{ margin: '14px 0', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px dashed #86efac', textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                        🤖 Tải ảnh chuyển khoản (AI Tự động duyệt):
                      </div>
                      {proofImage ? (
                        <div style={{ margin: '6px 0', fontSize: '12px', color: '#15803d' }}>
                          ✓ Đã đính kèm ảnh bằng chứng chuyển khoản
                        </div>
                      ) : null}
                      <input type="file" accept="image/*" onChange={handleProofUpload} style={{ fontSize: '12px', width: '100%' }} />
                    </div>

                    <button
                      className="primary payment-submit"
                      onClick={handlePayment}
                      disabled={isProcessing || !canPay}
                    >
                      {isProcessing ? 'Đang kiểm tra AI & gửi...' : `✓ Xác nhận thanh toán (${selectedVehicle.plate} - Ô ${chosenSlot.slot_name})`}
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
                  Chọn gói cước mới bạn muốn áp dụng cho xe <strong>{selectedVehicle.plate}</strong> (Ô <strong>{chosenSlot.slot_name}</strong>):
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
                <h3 className="payment-section-title">Bước 3: Quét mã QR đổi gói</h3>
                {selectedPlan ? (
                  <div className="payment-checkout">
                    <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px', fontSize: '0.88rem' }}>
                      Đang chọn chuyển sang: <strong>{selectedPlan.plan_type}</strong> ({selectedPlan.price.toLocaleString()} đ) cho xe <strong>{selectedVehicle.plate}</strong> tại <strong>Ô {chosenSlot.slot_name}</strong>
                    </div>
                    <img
                      src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Doi goi ${selectedVehicle.plate} ${session.user.id.substring(0, 8)}`)}`}
                      alt="QR Code"
                      className="payment-qr"
                    />
                    <p className="payment-instructions">
                      Quét mã bằng app ngân hàng để chuyển khoản.<br/>
                      Nội dung chuyển khoản: <b>Doi goi {selectedVehicle.plate} {session.user.id.substring(0, 8)}</b>
                    </p>

                    {/* OCR AI Proof Upload */}
                    <div style={{ margin: '14px 0', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px dashed #86efac', textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                        🤖 Tải ảnh chuyển khoản (AI Tự động duyệt):
                      </div>
                      {proofImage ? (
                        <div style={{ margin: '6px 0', fontSize: '12px', color: '#15803d' }}>
                          ✓ Đã đính kèm ảnh bằng chứng chuyển khoản
                        </div>
                      ) : null}
                      <input type="file" accept="image/*" onChange={handleProofUpload} style={{ fontSize: '12px', width: '100%' }} />
                    </div>

                    <button
                      className="primary payment-submit"
                      onClick={handlePayment}
                      disabled={isProcessing || !canPay}
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
        </>
      )}

      {showSlotPreview && selectedVehicle && (
        <SlotPreviewModal
          vehicleType={selectedVehicle.type}
          onSelectSlot={async (slot) => {
            setChosenSlot(slot);
            try {
              await apiFetch('/api/components/user/UserSlotPicker/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vehicleId: selectedVehicle.id,
                  selectedSlotId: slot.id,
                }),
              });
            } catch (e) {
              console.warn('Slot save warning:', e);
            }
          }}
          onClose={() => setShowSlotPreview(false)}
        />
      )}

      {showAddVehicleModal && (
        <VehicleDialog
          userId={session.user.id}
          onClose={() => setShowAddVehicleModal(false)}
          onSaved={(newVeh) => fetchUserVehicles(newVeh?.plate)}
        />
      )}
    </div>
  );
}
