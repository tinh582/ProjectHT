import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import SlotPreviewModal from './SlotPreviewModal';
import VehicleDialog from './VehicleDialog';

const FIXED_TERM_TIERS = [
  {
    months: 1,
    title: 'Gia hạn cố định 1 tháng',
    discountReturning: 10,
    discountNew: 0,
    bonusDays: 3,
    badge: 'Tri ân Khách hàng cũ (-10%)'
  },
  {
    months: 3,
    title: 'Gắn bó cố định 3 tháng',
    discountReturning: 15,
    discountNew: 15,
    bonusDays: 7,
    badge: 'Tiết kiệm 15% + Tặng 7 ngày'
  },
  {
    months: 6,
    title: 'Gắn bó cố định 6 tháng (VIP)',
    discountReturning: 20,
    discountNew: 20,
    bonusDays: 15,
    badge: 'Ưu đãi VIP 20% + Tặng 15 ngày'
  }
];

export default function UserPayment({ session, fetchNotifications, onSubscriptionChange }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [fixedMonths, setFixedMonths] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  // Slot preview & OCR Payment Proof
  const [showSlotPreview, setShowSlotPreview] = useState(false);
  const [chosenSlot, setChosenSlot] = useState(null);
  const [isSlotLocked, setIsSlotLocked] = useState(false);
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
          const found = list.find((v) => v.plate === autoSelectPlate);
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
    // Check if vehicle already has an assigned fixed slot from vehicles query
    const preAssigned = vehicle?.parking_slots?.[0] || null;
    if (preAssigned) {
      setChosenSlot(preAssigned);
      setIsSlotLocked(true);
      return;
    }
    setChosenSlot(null);
    setIsSlotLocked(false);
    if (!vehicle?.type) return;
    try {
      const res = await apiFetch(`/api/components/user/UserSlotPicker/${encodeURIComponent(vehicle.type)}`);
      if (res.ok) {
        const allSlots = await res.json();
        const existing = (allSlots || []).find((s) => s.vehicle_id === vehicle.id);
        if (existing) {
          setChosenSlot(existing);
          setIsSlotLocked(true);
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
          setPricingConfigs((prevConfigs) => {
            const current = prevConfigs.find((p) => p.plan_type === data.plan_name);
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

  useEffect(() => {
    if (pricingConfigs.length > 0 && subscription?.plan_name && !selectedPlan) {
      const current = pricingConfigs.find((p) => p.plan_type === subscription.plan_name);
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

  const isReturningCustomer = Boolean(subscription?.plan_name || subscription?.isActive);
  const currentTier = FIXED_TERM_TIERS.find((t) => t.months === fixedMonths) || FIXED_TERM_TIERS[0];
  const discountPercent = isReturningCustomer ? currentTier.discountReturning : currentTier.discountNew;
  const bonusDays = isReturningCustomer || fixedMonths > 1 ? currentTier.bonusDays : 0;

  const baseMonthlyPrice = Number(selectedPlan?.price || subscription?.amount || 0);
  const originalTotalPrice = baseMonthlyPrice * fixedMonths;
  const finalDiscountedPrice = Math.round(originalTotalPrice * (1 - discountPercent / 100));
  const totalDurationDays = fixedMonths * 30 + bonusDays;

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
          fixedMonths,
          applyLoyalty: isReturningCustomer,
          proofImage
        })
      });

      const resData = await response.json().catch(() => ({}));

      if (response.ok) {
        if (resData.autoVerified) {
          setNotice({
            type: 'success',
            text: `🎉 Hệ thống AI đã nhận diện chứng từ thành công & tự động kích hoạt gói cước (${totalDurationDays} ngày, ưu đãi -${discountPercent}%)!`
          });
        } else {
          setNotice({
            type: 'success',
            text: `Yêu cầu gia hạn cố định cho xe ${selectedVehicle.plate} (Ô cố định ${chosenSlot.slot_name}) với ưu đãi -${discountPercent}% đã được gửi thành công!`
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
    } catch {
      setNotice({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
  const isExpired = expiryDate ? new Date() > expiryDate : false;
  const hasPending = Boolean(subscription?.hasPending);

  const remainingDays =
    expiryDate && !isExpired ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const canPay = Boolean(selectedVehicle && chosenSlot && selectedPlan);

  return (
    <div className="resub-dashboard-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHÍNH SÁCH CHỖ ĐỖ CỐ ĐỊNH & ƯU ĐÃI KHÁCH HÀNG THÂN THIẾT</p>
          <h1>Gia hạn & Chính sách ưu đãi<span>.</span></h1>
        </div>
      </div>

      {/* Current Subscription Card */}
      <div className="current-sub-card">
        <div className="current-sub-header">
          <div className="current-sub-title-group">
            <span className="current-sub-badge">GÓI CỐ ĐỊNH ĐANG SỬ DỤNG</span>
            <h2 className="current-sub-name">{subscription?.plan_name || 'Gói Dịch Vụ HT Parking'}</h2>
          </div>
          <div className="current-sub-status" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isReturningCustomer && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800
                }}
              >
                👑 Khách hàng Cũ Thân thiết (Ưu đãi -10% đến -20%)
              </span>
            )}
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
            <span className="meta-label">Giá niêm yết</span>
            <span className="meta-value">
              {subscription?.amount ? `${subscription.amount.toLocaleString()} đ / tháng` : '-'}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Chính sách vị trí đỗ</span>
            <span className="meta-value highlight-green">🔒 Cố định 1 Slot = 1 Xe (Không đổi chỗ)</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Chu kỳ thuê gói</span>
            <span className="meta-value" style={{ fontSize: '12px' }}>
              {subscription?.cycle_start
                ? `${new Date(subscription.cycle_start).toLocaleDateString('vi-VN')} - ${new Date(
                    subscription.cycle_end
                  ).toLocaleDateString('vi-VN')}`
                : expiryDate
                ? `Đến ${expiryDate.toLocaleDateString('vi-VN')}`
                : '-'}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Ưu đãi hiện hưởng</span>
            <span className="meta-value" style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>
              {isReturningCustomer ? 'Giảm 10% - 20% + Tặng ngày khi gia hạn cố định' : 'Áp dụng từ chu kỳ thứ 2'}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Banner */}
      {hasPending && (
        <div className="payment-pending-alert">
          ⏳ <strong>Yêu cầu đang chờ duyệt:</strong> Bạn đã gửi yêu cầu gia hạn gói cước. Nhân viên bãi xe đang đối
          soát thanh toán và sẽ cập nhật thời hạn thẻ trong ít phút.
        </div>
      )}

      {/* Notice Message */}
      {notice && (
        <div
          className={`activation-alert-msg ${notice.type === 'error' ? 'is-error' : 'is-success'}`}
          style={{ marginBottom: '20px' }}
        >
          <span>{notice.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{notice.text}</span>
        </div>
      )}

      {/* =========================================================
          STEP 1 & STEP 2: FIXED SLOT LOCK (NO SLOT SWAPPING)
         ========================================================= */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
          Thông tin Phương tiện & Chỗ đỗ Cố định (Đã chọn chỗ cố định sẽ giữ nguyên suốt chu kỳ)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Step 1: Vehicle */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: selectedVehicle ? '2px solid #10b981' : '2px solid #3b82f6'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>1. Phương tiện đăng ký</strong>
              <button
                type="button"
                className="secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setShowAddVehicleModal(true)}
              >
                ＋ Thêm xe mới
              </button>
            </div>
            {vehicles.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Bạn chưa có phương tiện nào. Hãy nhấn "+ Thêm xe mới" trước.
              </p>
            ) : (
              <select
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  const v = vehicles.find((item) => String(item.id) === e.target.value);
                  if (v) handleSelectVehicle(v);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600
                }}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.type} ({v.brand} {v.model})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Fixed Parking Slot (Locked once chosen) */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: chosenSlot ? '2px solid #10b981' : selectedVehicle ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              opacity: selectedVehicle ? 1 : 0.6
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>2. Vị trí đỗ cố định (1 Slot = 1 Xe)</strong>
              {!chosenSlot && !isSlotLocked ? (
                <button
                  type="button"
                  className="primary"
                  disabled={!selectedVehicle}
                  onClick={() => setShowSlotPreview(true)}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Chọn vị trí đỗ cố định →
                </button>
              ) : (
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: 700
                  }}
                >
                  🔒 Đã cố định vị trí (Không đổi chỗ)
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: chosenSlot ? '#065f46' : '#64748b',
                fontWeight: chosenSlot ? 700 : 400
              }}
            >
              {chosenSlot
                ? `✓ Ô đỗ cố định: ${chosenSlot.slot_name} — Gắn cố định với xe ${selectedVehicle?.plate}`
                : '⚠️ Xe mới chưa có ô đỗ. Vui lòng chọn một vị trí cố định trên sơ đồ.'}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          LOYALTY POLICY FOR EXISTING CUSTOMERS ON FIXED DURATION
         ========================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fcd34d',
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#92400e' }}>
              🎁 Chính sách Ưu đãi Khách hàng Cũ & Thuê Chỗ Đỗ Cố định
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#78350f' }}>
              Khách hàng cũ gắn bó tại vị trí đỗ cố định được giảm giá trực tiếp từ <strong>10% đến 20%</strong> và tặng thêm ngày sử dụng miễn phí:
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {FIXED_TERM_TIERS.map((tier) => {
            const isSelected = fixedMonths === tier.months;
            const disc = isReturningCustomer ? tier.discountReturning : tier.discountNew;
            const rawPrice = baseMonthlyPrice * tier.months;
            const afterDisc = Math.round(rawPrice * (1 - disc / 100));

            return (
              <div
                key={tier.months}
                onClick={() => setFixedMonths(tier.months)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: isSelected ? '2.5px solid #d97706' : '1px solid #fde68a',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 6px 16px rgba(217, 119, 6, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>{tier.title}</strong>
                  {isSelected && <span style={{ color: '#d97706', fontWeight: 800 }}>✓ Đang chọn</span>}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    background: '#fef3c7',
                    color: '#b45309',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}
                >
                  {tier.badge}
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569' }}>
                  {disc > 0 && (
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: '8px' }}>
                      {rawPrice.toLocaleString('vi-VN')} đ
                    </span>
                  )}
                  <strong style={{ fontSize: '16px', color: '#059669' }}>
                    {afterDisc.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
                  ✓ Tổng cộng: {tier.months * 30 + tier.bonusDays} ngày (Tặng +{tier.bonusDays} ngày)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!canPay ? (
        <div
          style={{
            padding: '28px',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: '#475569'
          }}
        >
          🔒 <strong>Bước Thanh toán đang khóa:</strong> Vui lòng chọn <strong>Phương tiện</strong> và{' '}
          <strong>Vị trí đỗ cố định</strong> ở khung phía trên để hiển thị mã QR thanh toán.
        </div>
      ) : (
        <div className="payment-columns">
          <div className="payment-column">
            <h3 className="payment-section-title">Chi tiết Gói Gia hạn & Ưu đãi Khách hàng Cũ</h3>
            <div className="resub-info-box">
              <div className="resub-badge-highlight">
                GIA HẠN CỐ ĐỊNH {fixedMonths} THÁNG ({totalDurationDays} NGÀY)
              </div>
              <h4>{selectedPlan?.plan_type || subscription?.plan_name || 'Gói cước của bạn'}</h4>
              <p className="resub-desc">
                Áp dụng cho xe <strong>{selectedVehicle.plate}</strong> tại vị trí đỗ cố định{' '}
                <strong>Ô {chosenSlot.slot_name}</strong> (Chính sách giữ nguyên vị trí cố định, không đổi chỗ).
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '12px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Giá gốc ({fixedMonths} tháng):</span>
                  <span>{originalTotalPrice.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#d97706', fontWeight: 700 }}>
                  <span>Ưu đãi khách hàng cũ (-{discountPercent}%):</span>
                  <span>-{(originalTotalPrice - finalDiscountedPrice).toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                  <span>Ngày tặng thêm miễn phí:</span>
                  <span>+{bonusDays} ngày</span>
                </div>
              </div>

              <div className="resub-price-tag">
                <span className="resub-price-val">{finalDiscountedPrice.toLocaleString('vi-VN')}</span>
                <span className="resub-price-currency">VNĐ / {totalDurationDays} ngày</span>
              </div>
            </div>
          </div>

          <div className="payment-column">
            <h3 className="payment-section-title">Quét mã VietQR Thanh toán (Đã áp dụng ưu đãi)</h3>
            {selectedPlan ? (
              <div className="payment-checkout">
                <img
                  src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(
                    paymentAccount
                  )}-compact2.jpg?amount=${finalDiscountedPrice}&addInfo=${encodeURIComponent(
                    `Gia han ${selectedVehicle.plate} ${session.user.id.substring(0, 8)}`
                  )}`}
                  alt="QR Code"
                  className="payment-qr"
                />
                <p className="payment-instructions">
                  Quét mã bằng app ngân hàng để chuyển khoản nhanh.<br />
                  Nội dung chuyển khoản: <b>Gia han {selectedVehicle.plate} {session.user.id.substring(0, 8)}</b>
                </p>

                {/* OCR AI Proof Upload */}
                <div
                  style={{
                    margin: '14px 0',
                    padding: '10px',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px dashed #86efac',
                    textAlign: 'left'
                  }}
                >
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
                  {isProcessing
                    ? 'Đang kiểm tra AI & gửi...'
                    : `✓ Xác nhận gia hạn (${finalDiscountedPrice.toLocaleString('vi-VN')} đ - Ô cố định ${chosenSlot.slot_name})`}
                </button>
              </div>
            ) : (
              <div className="payment-placeholder">Đang tải thông tin gói cước...</div>
            )}
          </div>
        </div>
      )}

      {showSlotPreview && selectedVehicle && !isSlotLocked && (
        <SlotPreviewModal
          vehicleType={selectedVehicle.type}
          onSelectSlot={async (slot) => {
            setChosenSlot(slot);
            setIsSlotLocked(true);
            try {
              await apiFetch('/api/components/user/UserSlotPicker/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vehicleId: selectedVehicle.id,
                  selectedSlotId: slot.id
                })
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
