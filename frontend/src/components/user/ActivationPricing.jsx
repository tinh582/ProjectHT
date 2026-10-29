import { apiFetch } from '../../lib/api';
import { compareSlots } from '../../lib/slots';
import React, { useState, useEffect } from 'react';
import VehicleDialog from './VehicleDialog';
import SlotPreviewModal from './SlotPreviewModal';

export default function ActivationPricing({ session, onBackToLanding, onUnlocked, onLogout }) {
  // Step 1: Vehicle state
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Step 2: Slot state for selectedVehicle
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [showFullSlotModal, setShowFullSlotModal] = useState(false);

  // Step 3: Pricing & Payment state
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  const paymentBank = import.meta.env.VITE_PAYMENT_BANK || 'BIDV';
  const paymentAccount = import.meta.env.VITE_PAYMENT_ACCOUNT || '6261378455';

  useEffect(() => {
    fetchVehicles();
    fetchPricing();
    fetchSubscription();
  }, []);

  const fetchVehicles = async (autoSelectPlate = null) => {
    setLoadingVehicles(true);
    try {
      const response = await apiFetch(`/api/components/user/Dashboard/vehicles/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        const list = data.vehicles || [];
        setVehicles(list);

        if (autoSelectPlate) {
          const matched = list.find(v => v.plate === autoSelectPlate);
          if (matched) {
            handleSelectVehicle(matched);
            return;
          }
        }
        if (selectedVehicle) {
          const updated = list.find(v => v.id === selectedVehicle.id);
          if (updated) {
            setSelectedVehicle(updated);
          }
        }
      }
    } catch (err) {
      console.error('Failed fetching vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchSlotsForVehicle = async (vehicle) => {
    if (!vehicle?.type) return;
    setLoadingSlots(true);
    try {
      const response = await apiFetch(`/api/components/user/UserSlotPicker/${encodeURIComponent(vehicle.type)}`);
      if (response.ok) {
        const allSlots = await response.json();
        const sorted = Array.isArray(allSlots) ? [...allSlots].sort(compareSlots) : [];
        setSlots(sorted);

        // Check if this vehicle already has a reserved slot
        const existingSlot = sorted.find(s => s.vehicle_id === vehicle.id);
        if (existingSlot) {
          setSelectedSlot(existingSlot);
        } else {
          setSelectedSlot(null);
        }
      }
    } catch (err) {
      console.error('Failed fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchPricing = async () => {
    try {
      const response = await apiFetch('/api/components/user/UserPayment/pricing');
      if (response.ok) {
        const data = await response.json();
        setPricingConfigs(data || []);
        if (data && data.length > 0 && !selectedPlan) {
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
          onUnlocked?.();
        }
      }
    } catch (err) {
      console.error('Failed fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync matching pricing plan when vehicle type changes
  useEffect(() => {
    if (selectedVehicle && pricingConfigs.length > 0) {
      const isMoto = selectedVehicle.type === 'Xe máy';
      const matchingPlan = pricingConfigs.find(p => {
        const name = (p.plan_type || '').toLowerCase();
        return isMoto ? name.includes('máy') : (name.includes('ô tô') || name.includes('oto') || !name.includes('máy'));
      });
      if (matchingPlan) {
        setSelectedPlan(matchingPlan);
      }
    }
  }, [selectedVehicle, pricingConfigs]);

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setNotice(null);
    fetchSlotsForVehicle(vehicle);
  };

  const handleChooseSlot = async (slot) => {
    if (!selectedVehicle || !slot) return;
    const isMine = slot.vehicle_id === selectedVehicle.id;
    const isAvailable = slot.status === 'empty' || isMine;
    if (!isAvailable) return;

    setSelectedSlot(slot);
    setSavingSlot(true);
    setNotice(null);
    try {
      const response = await apiFetch('/api/components/user/UserSlotPicker/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          selectedSlotId: slot.id,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setNotice({
          type: 'error',
          text: errData.error || 'Không thể giữ vị trí đỗ này. Vui lòng chọn vị trí trống khác.',
        });
        await fetchSlotsForVehicle(selectedVehicle);
      } else {
        // Refresh slots to reflect ownership
        const updatedSlots = slots.map(s => {
          if (s.id === slot.id) return { ...s, status: 'rented', vehicle_id: selectedVehicle.id };
          if (s.vehicle_id === selectedVehicle.id) return { ...s, status: 'empty', vehicle_id: null };
          return s;
        });
        setSlots(updatedSlots);
      }
    } catch (err) {
      console.warn('Slot save warning:', err);
    } finally {
      setSavingSlot(false);
    }
  };

  const handleAutoPickSlot = () => {
    const available = slots.filter(s => s.status === 'empty' || s.vehicle_id === selectedVehicle?.id);
    if (available.length > 0) {
      handleChooseSlot(available[0]);
    } else {
      alert('Hiện không còn vị trí đỗ trống cho loại xe này!');
    }
  };

  const handleRandomPickSlot = () => {
    const available = slots.filter(s => s.status === 'empty');
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      handleChooseSlot(random);
    } else {
      alert('Hiện không còn vị trí đỗ trống cho loại xe này!');
    }
  };

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

  const handlePay = async () => {
    if (!selectedVehicle) {
      setNotice({ type: 'error', text: 'Bước 1: Vui lòng chọn phương tiện của bạn trước.' });
      return;
    }
    if (!selectedSlot) {
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
          selectedSlotId: selectedSlot.id,
          proofImage,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (response.ok) {
        if (resData.autoVerified) {
          setNotice({
            type: 'success',
            text: '🎉 Hệ thống AI đã xác thực biên lai thành công và kích hoạt gói cước! Đang mở khóa Bảng điều khiển...',
          });
          await fetchSubscription();
          onUnlocked?.();
        } else {
          setNotice({
            type: 'success',
            text: `Đã ghi nhận yêu cầu thanh toán cho xe ${selectedVehicle.plate} tại vị trí ${selectedSlot.slot_name}! Nhân viên bãi xe sẽ xác nhận đối soát và tự động mở khóa Bảng điều khiển cho bạn.`,
          });
          await fetchSubscription();
        }
      } else {
        setNotice({
          type: 'error',
          text: resData.error || 'Gửi yêu cầu thanh toán không thành công. Vui lòng thử lại.',
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
  const step1Done = Boolean(selectedVehicle);
  const step2Done = Boolean(selectedVehicle && selectedSlot);
  const emptySlotsCount = slots.filter(s => s.status === 'empty' || s.vehicle_id === selectedVehicle?.id).length;

  return (
    <div className="activation-page">
      {/* Top Header */}
      <header className="activation-header">
        <div className="activation-brand" onClick={onBackToLanding} role="button" tabIndex={0}>
          <span className="activation-logo-ht">HT</span>
          <span className="activation-logo-park">PARKING</span>
          <span className="activation-tag">ĐĂNG KÝ XE · CHỌN CHỖ · THANH TOÁN</span>
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
            <h2>Quy trình Kích hoạt Dịch vụ Đỗ xe (Bắt buộc 3 bước)</h2>
            <p>
              Để truy cập vào <strong>Bảng điều khiển (Dashboard)</strong>, bạn cần hoàn thành theo đúng thứ tự:
              <strong> (1) Chọn phương tiện</strong> → <strong>(2) Chọn vị trí đỗ cố định cho xe</strong> → <strong>(3) Thanh toán gói cước</strong>.
            </p>
          </div>
        </div>

        {/* Visual Stepper Progress Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
          background: '#ffffff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
            background: step1Done ? '#ecfdf5' : '#eff6ff',
            border: step1Done ? '1px solid #6ee7b7' : '2px solid #3b82f6'
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px',
              background: step1Done ? '#10b981' : '#3b82f6', color: '#fff'
            }}>{step1Done ? '✓' : '1'}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Bước 1: Phương tiện</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{step1Done ? `Đã chọn: ${selectedVehicle.plate}` : 'Chọn hoặc thêm xe'}</div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
            background: step2Done ? '#ecfdf5' : step1Done ? '#eff6ff' : '#f8fafc',
            border: step2Done ? '1px solid #6ee7b7' : step1Done ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            opacity: step1Done ? 1 : 0.6
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px',
              background: step2Done ? '#10b981' : step1Done ? '#3b82f6' : '#94a3b8', color: '#fff'
            }}>{step2Done ? '✓' : '2'}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Bước 2: Vị trí đỗ</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{step2Done ? `Ô đỗ: ${selectedSlot.slot_name}` : step1Done ? 'Chọn slot cố định' : '🔒 Chờ Bước 1'}</div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
            background: isActive ? '#ecfdf5' : step2Done ? '#eff6ff' : '#f8fafc',
            border: isActive ? '1px solid #6ee7b7' : step2Done ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            opacity: step2Done ? 1 : 0.6
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px',
              background: isActive ? '#10b981' : step2Done ? '#3b82f6' : '#94a3b8', color: '#fff'
            }}>{isActive ? '✓' : '3'}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Bước 3: Thanh toán</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{isActive ? 'Đã kích hoạt' : step2Done ? 'Quét QR & Xác thực' : '🔒 Chờ Bước 2'}</div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
            background: isActive ? '#ecfdf5' : '#f8fafc',
            border: isActive ? '2px solid #10b981' : '1px solid #e2e8f0',
            opacity: isActive ? 1 : 0.6
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px',
              background: isActive ? '#10b981' : '#94a3b8', color: '#fff'
            }}>{isActive ? '✓' : '4'}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Bước 4: Dashboard</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{isActive ? 'Đã mở khóa' : '🔒 Mở sau thanh toán'}</div>
            </div>
          </div>
        </div>

        {/* Pending Banner if transaction is awaiting confirmation */}
        {hasPending && (
          <div className="activation-pending-card">
            <div className="pending-badge">⏳ ĐANG CHỜ NHÂN VIÊN ĐỐI SOÁT</div>
            <h3>Yêu cầu kích hoạt của bạn đã được tiếp nhận</h3>
            <p>
              Hệ thống đã ghi nhận yêu cầu đăng ký gói cước và giữ vị trí đỗ của bạn. Sau khi xác nhận thanh toán (hoặc tải lên ảnh biên lai để AI duyệt tự động), Bảng điều khiển sẽ mở khóa ngay lập tức!
            </p>
            <button className="activation-btn-refresh" onClick={fetchSubscription} disabled={loading}>
              {loading ? 'Đang kiểm tra...' : '🔄 Kiểm tra lại trạng thái mở khóa'}
            </button>
          </div>
        )}

        {/* Notice Message */}
        {notice && (
          <div className={`activation-alert-msg ${notice.type === 'error' ? 'is-error' : 'is-success'}`} style={{ marginBottom: '20px' }}>
            <span>{notice.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{notice.text}</span>
          </div>
        )}

        {/* If already active, show celebratory unlock button */}
        {isActive && (
          <div className="activation-unlocked-card">
            <div className="unlocked-icon">🎉</div>
            <h3>Gói cước của bạn đã được kích hoạt thành công!</h3>
            <p>Phương tiện và vị trí đỗ đã sẵn sàng. Bạn có thể truy cập Bảng điều khiển ngay bây giờ.</p>
            <button className="activation-btn-enter" onClick={onUnlocked}>
              Truy cập Bảng điều khiển ngay →
            </button>
          </div>
        )}

        {/* =========================================================
            STEP 1: CHOOSE / REGISTER VEHICLE FIRST
           ========================================================= */}
        <div style={{
          background: '#fff', borderRadius: '14px', padding: '24px', marginBottom: '24px',
          border: step1Done ? '2px solid #10b981' : '2px solid #3b82f6',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                background: step1Done ? '#d1fae5' : '#dbeafe', color: step1Done ? '#065f46' : '#1e40af', marginBottom: '6px'
              }}>
                BƯỚC 1 / 3 · BẮT BUỘC ĐẦU TIÊN
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>1. Chọn phương tiện của bạn</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Chọn một phương tiện đã đăng ký bên dưới hoặc thêm phương tiện mới để xác định loại xe và biển số.
              </p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => setShowAddVehicleModal(true)}
              style={{ padding: '10px 18px', fontWeight: 600 }}
            >
              ＋ Thêm phương tiện mới
            </button>
          </div>

          {loadingVehicles ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Đang tải danh sách phương tiện...</p>
          ) : vehicles.length === 0 ? (
            <div style={{
              padding: '28px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Bạn chưa có phương tiện nào</h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                Vui lòng thêm phương tiện của bạn trước tiên để hệ thống mở khóa chọn vị trí đỗ và thanh toán.
              </p>
              <button type="button" className="primary" onClick={() => setShowAddVehicleModal(true)}>
                ＋ Đăng ký phương tiện đầu tiên ngay
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {vehicles.map((v) => {
                const isSelected = selectedVehicle?.id === v.id;
                const currentSlotName = Array.isArray(v.parking_slots)
                  ? v.parking_slots[0]?.slot_name
                  : v.parking_slots?.slot_name;

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVehicle(v)}
                    role="button"
                    tabIndex={0}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected ? '#f0fdf4' : '#f8fafc',
                      border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>{v.type === 'Xe máy' ? '🛵' : '🚗'}</span>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                        background: isSelected ? '#10b981' : '#e2e8f0',
                        color: isSelected ? '#fff' : '#475569'
                      }}>
                        {isSelected ? '✓ Đang chọn' : 'Nhấn để chọn'}
                      </span>
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                      {v.plate}
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                      {v.type} · {v.brand} {v.model} ({v.color})
                    </div>
                    {currentSlotName && (
                      <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
                        📍 Vị trí đã gắn: {currentSlotName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================
            STEP 2: CHOOSE PARKING SLOT FOR THAT VEHICLE
           ========================================================= */}
        <div style={{
          background: '#fff', borderRadius: '14px', padding: '24px', marginBottom: '24px',
          border: step2Done ? '2px solid #10b981' : step1Done ? '2px solid #3b82f6' : '1px solid #e2e8f0',
          opacity: step1Done ? 1 : 0.65,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                background: step2Done ? '#d1fae5' : step1Done ? '#dbeafe' : '#f1f5f9',
                color: step2Done ? '#065f46' : step1Done ? '#1e40af' : '#64748b', marginBottom: '6px'
              }}>
                BƯỚC 2 / 3 · {step1Done ? 'ĐÃ MỞ KHÓA' : '🔒 CHỜ BƯỚC 1'}
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                2. Chọn vị trí đỗ cố định {selectedVehicle ? `cho xe ${selectedVehicle.plate} (${selectedVehicle.type})` : ''}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Mỗi vị trí đỗ chỉ gắn duy nhất với một phương tiện (1 Slot = 1 Xe). Bạn phải chọn vị trí đỗ trước khi thanh toán.
              </p>
            </div>

            {step1Done && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="secondary" onClick={handleAutoPickSlot} disabled={savingSlot}>
                  ⚡ Tự động chọn ô gần nhất
                </button>
                <button type="button" className="secondary" onClick={handleRandomPickSlot} disabled={savingSlot}>
                  🎲 Chọn ngẫu nhiên
                </button>
                <button type="button" className="secondary" onClick={() => setShowFullSlotModal(true)}>
                  🗺️ Mở sơ đồ lớn
                </button>
              </div>
            )}
          </div>

          {!step1Done ? (
            <div style={{
              padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b'
            }}>
              🔒 <strong>Bước 2 đang khóa:</strong> Vui lòng chọn hoặc đăng ký phương tiện ở <strong>Bước 1</strong> trước để xem sơ đồ vị trí đỗ tương ứng với loại xe của bạn.
            </div>
          ) : (
            <div>
              {/* Technical Infrastructure & 1 Slot = 1 Car banner */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px',
                padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '12px'
              }}>
                <div>🔒 Ràng buộc: <strong>1 Slot = 1 Xe ({selectedVehicle.plate})</strong></div>
                <div>💧 Thoát nước: <strong>Tốt (Chống ngập)</strong></div>
                <div>📡 Cảm biến: <strong>Hoạt động 100%</strong></div>
                <div>📹 Camera AI: <strong>Góc rộng 24/7</strong></div>
                <div>🟢 Trống khả dụng: <strong>{emptySlotsCount} vị trí</strong></div>
              </div>

              {selectedSlot && (
                <div style={{
                  padding: '10px 14px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px',
                  color: '#065f46', fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>✓ Đã chọn vị trí đỗ cố định: <strong>Ô {selectedSlot.slot_name}</strong> cho xe <strong>{selectedVehicle.plate}</strong></span>
                  <span style={{ fontSize: '12px', color: '#047857' }}>Đã mở khóa Bước 3 (Thanh toán) ↓</span>
                </div>
              )}

              <div className="slot-picker-legend" style={{ marginBottom: '12px' }}>
                <span className="slot-picker-legend-item"><div className="slot-picker-legend-empty"></div> Trống (Có thể chọn)</span>
                <span className="slot-picker-legend-item"><div className="slot-picker-legend-rented"></div> Đã thuê (Không thể chọn)</span>
                <span className="slot-picker-legend-item"><div className="slot-picker-legend-occupied"></div> Đang đỗ (Không thể chọn)</span>
                <span className="slot-picker-legend-item"><div className="slot-picker-legend-selected"></div> Vị trí đang chọn</span>
              </div>

              {loadingSlots ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>Đang tải sơ đồ vị trí đỗ cho {selectedVehicle.type}...</p>
              ) : slots.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>Chưa có vị trí đỗ nào được thiết lập cho loại xe {selectedVehicle.type}.</p>
              ) : (
                <div className="slot-picker-grid" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {slots.map(slot => {
                    const isMine = slot.vehicle_id === selectedVehicle.id;
                    const isSelected = selectedSlot?.id === slot.id;
                    const isAvailable = slot.status === 'empty' || isMine;

                    return (
                      <div
                        key={slot.id}
                        onClick={() => {
                          if (isAvailable && !savingSlot) handleChooseSlot(slot);
                        }}
                        className={`slot-picker-space ${isSelected ? 'is-selected' : !isMine && slot.status === 'rented' ? 'is-rented' : !isMine && slot.status === 'occupied' ? 'is-occupied' : 'is-available'}`}
                      >
                        <b className={`slot-picker-space-name ${isSelected ? 'is-selected' : 'is-unselected'}`}>{slot.slot_name}</b>
                        <span style={{ fontSize: '10px', color: isSelected ? '#fff' : '#64748b' }}>
                          {isSelected ? 'Đang chọn' : isMine ? 'Xe của bạn' : isAvailable ? 'Trống' : slot.status === 'rented' ? 'Đã thuê' : 'Có xe'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================
            STEP 3: PAYMENT (ONLY AFTER VEHICLE + SLOT ARE CHOSEN)
           ========================================================= */}
        <div style={{
          background: '#fff', borderRadius: '14px', padding: '24px',
          border: step2Done ? '2px solid #3b82f6' : '1px solid #e2e8f0',
          opacity: step2Done ? 1 : 0.6,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{
              display: 'inline-block', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
              background: step2Done ? '#dbeafe' : '#f1f5f9',
              color: step2Done ? '#1e40af' : '#64748b', marginBottom: '6px'
            }}>
              BƯỚC 3 / 3 · {step2Done ? 'SẴN SÀNG THANH TOÁN' : '🔒 CHỜ HOÀN THÀNH BƯỚC 1 & 2'}
            </span>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>3. Chọn gói cước & Thanh toán kích hoạt</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Chỉ sau khi đã chọn phương tiện và vị trí đỗ cố định, bạn mới thực hiện thanh toán để mở khóa Bảng điều khiển.
            </p>
          </div>

          {!step2Done ? (
            <div style={{
              padding: '28px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b'
            }}>
              🔒 <strong>Bước 3 (Thanh toán) đang khóa:</strong>{' '}
              {!step1Done
                ? 'Vui lòng hoàn thành Bước 1 (Chọn phương tiện) và Bước 2 (Chọn vị trí đỗ) trước.'
                : `Bạn đã chọn xe ${selectedVehicle.plate}. Vui lòng chọn một vị trí đỗ trống ở Bước 2 phía trên để mở khóa thanh toán.`}
            </div>
          ) : (
            <div className="activation-content-grid">
              {/* Column 1: Plan Selection */}
              <div className="activation-plans-panel">
                <div className="panel-title-row">
                  <h3>Chọn gói cước đỗ xe</h3>
                  <span className="panel-hint">Phù hợp cho {selectedVehicle.type}</span>
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
                          <li>✓ Gắn cố định cho xe <strong>{selectedVehicle.plate}</strong> tại ô <strong>{selectedSlot.slot_name}</strong></li>
                          <li>✓ Tự động nhận diện biển số AI qua cổng 24/7</li>
                          <li>✓ Mở khóa toàn bộ Bảng điều khiển sau khi thanh toán</li>
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: VietQR Checkout & Proof Upload */}
              <div className="activation-payment-panel">
                <div className="panel-title-row">
                  <h3>Quét mã VietQR & Xác thực thanh toán</h3>
                  <span className="panel-hint">Duyệt tự động bằng AI OCR</span>
                </div>

                {selectedPlan ? (
                  <div className="activation-checkout-card">
                    {/* Booking Summary Box */}
                    <div style={{
                      background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 14px',
                      marginBottom: '16px', fontSize: '13px', color: '#14532d'
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>📋 Tóm tắt đăng ký của bạn:</div>
                      <div>• <strong>Phương tiện (Bước 1):</strong> {selectedVehicle.plate} ({selectedVehicle.type} - {selectedVehicle.brand} {selectedVehicle.model})</div>
                      <div>• <strong>Vị trí đỗ cố định (Bước 2):</strong> Ô {selectedSlot.slot_name} (1 Slot = 1 Xe)</div>
                      <div>• <strong>Gói cước (Bước 3):</strong> {selectedPlan.plan_type} — <strong>{selectedPlan.price.toLocaleString()} VNĐ</strong></div>
                    </div>

                    <div className="qr-container">
                      <img
                        src={`https://img.vietqr.io/image/${encodeURIComponent(paymentBank)}-${encodeURIComponent(paymentAccount)}-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(`Thanh toan ${selectedVehicle.plate} ${session.user.id.substring(0, 8)}`)}`}
                        alt="VietQR Code"
                        className="activation-qr-image"
                      />
                      <div className="qr-instruction">
                        <p>Mở ứng dụng ngân hàng bất kỳ để quét mã QR thanh toán chính xác số tiền và nội dung.</p>
                      </div>
                    </div>

                    <div className="bank-info-table">
                      <div className="bank-row">
                        <span className="bank-lbl">Ngân hàng:</span>
                        <span className="bank-val font-semibold">{paymentBank}</span>
                      </div>
                      <div className="bank-row">
                        <span className="bank-lbl">Số tài khoản:</span>
                        <span className="bank-val font-mono">{paymentAccount}</span>
                      </div>
                      <div className="bank-row">
                        <span className="bank-lbl">Số tiền:</span>
                        <span className="bank-val highlight">{selectedPlan.price.toLocaleString()} đ</span>
                      </div>
                      <div className="bank-row">
                        <span className="bank-lbl">Nội dung CK:</span>
                        <span className="bank-val font-mono memo">Thanh toan {selectedVehicle.plate} {session.user.id.substring(0, 8)}</span>
                      </div>
                    </div>

                    {/* OCR AI Proof Upload */}
                    <div style={{
                      margin: '14px 0', padding: '12px', background: '#f8fafc', borderRadius: '8px',
                      border: '1px dashed #94a3b8', textAlign: 'left'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        🤖 Tải ảnh chụp biên lai chuyển khoản (AI OCR tự động duyệt):
                      </div>
                      {proofImage && (
                        <div style={{ margin: '6px 0', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                          ✓ Đã đính kèm ảnh chứng từ thanh toán
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofUpload}
                        style={{ fontSize: '12px', width: '100%' }}
                      />
                    </div>

                    <button
                      className="activation-btn-submit"
                      onClick={handlePay}
                      disabled={isProcessing || !selectedVehicle || !selectedSlot}
                    >
                      {isProcessing
                        ? 'Đang xử lý thanh toán...'
                        : `✓ Hoàn tất Thanh toán (${selectedVehicle.plate} - Ô ${selectedSlot.slot_name}) & Mở khóa Dashboard`}
                    </button>
                    <p className="activation-subtext">
                      Bảng điều khiển sẽ được mở khóa ngay sau khi thanh toán được xác nhận.
                    </p>
                  </div>
                ) : (
                  <div className="activation-placeholder-card">
                    <p>Vui lòng chọn một gói cước bên trái để hiển thị thông tin chuyển khoản và mã QR.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Add Vehicle (Step 1) */}
      {showAddVehicleModal && (
        <VehicleDialog
          userId={session.user.id}
          onClose={() => setShowAddVehicleModal(false)}
          onSaved={(newVeh) => {
            fetchVehicles(newVeh?.plate);
          }}
        />
      )}

      {/* Modal Full Slot Map Preview (Step 2) */}
      {showFullSlotModal && selectedVehicle && (
        <SlotPreviewModal
          vehicleType={selectedVehicle.type}
          onSelectSlot={(slot) => handleChooseSlot(slot)}
          onClose={() => setShowFullSlotModal(false)}
        />
      )}
    </div>
  );
}
