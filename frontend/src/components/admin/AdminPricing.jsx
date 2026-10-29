import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';

const PRESET_PLANS = [
  {
    plan_type: 'Vé tháng Ô tô (Cố định 1 Slot = 1 Xe)',
    price: 900000,
    vehicle_type: 'Ô tô',
    duration_days: 30,
    description: 'Khóa cố định 1 ô đỗ Ô tô • Bảo vệ chống ngập 3 cấp • Duyệt AI OCR 3 giây'
  },
  {
    plan_type: 'Vé tháng Xe máy (Cố định 1 Slot = 1 Xe)',
    price: 400000,
    vehicle_type: 'Xe máy',
    duration_days: 30,
    description: 'Khóa cố định 1 vị trí Xe máy • Ra vào 24/7 không chạm • Hầm B2 khô ráo'
  },
  {
    plan_type: 'Vé quý Ô tô (3 Tháng - Tiết kiệm 10%)',
    price: 2450000,
    vehicle_type: 'Ô tô',
    duration_days: 90,
    description: 'Ưu đãi 90 ngày • Ô đỗ Ô tô cố định gần thang máy • Bảo hiểm toàn diện'
  },
  {
    plan_type: 'Vé năm Ô tô VIP (365 Ngày)',
    price: 9200000,
    vehicle_type: 'Ô tô',
    duration_days: 365,
    description: 'Đặc quyền VIP 365 ngày • Vị trí đẹp nhất hầm B1 • Cứu hộ 24/7 miễn phí'
  }
];

export default function AdminPricing() {
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  // Create Form State
  const [newPlanType, setNewPlanType] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('Ô tô');
  const [newDurationDays, setNewDurationDays] = useState(30);
  const [newDescription, setNewDescription] = useState(
    'Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp • Duyệt tự động AI OCR'
  );

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState({
    plan_type: '',
    price: '',
    vehicle_type: 'Ô tô',
    duration_days: 30,
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const fetchPricing = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/api/components/admin/AdminPricing');
      if (!response.ok) return;
      const data = await response.json();
      setPricingConfigs(data || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredPricing = useMemo(() => {
    return pricingConfigs.filter((p) => {
      if (vehicleFilter !== 'all' && p.vehicle_type !== vehicleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (p.plan_type || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pricingConfigs, vehicleFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = pricingConfigs.length;
    const carPlans = pricingConfigs.filter((p) => p.vehicle_type === 'Ô tô').length;
    const motoPlans = pricingConfigs.filter((p) => p.vehicle_type === 'Xe máy').length;
    return { total, carPlans, motoPlans };
  }, [pricingConfigs]);

  // ------------------------------------------------------------
  // CREATE PRICING PLAN
  // ------------------------------------------------------------
  const handleAddPricing = async (e) => {
    e.preventDefault();
    if (!newPlanType || newPrice === '') return;
    setSaving(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/api/components/admin/AdminPricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: newPlanType.trim(),
          price: parseFloat(newPrice),
          vehicle_type: newVehicleType,
          duration_days: Number(newDurationDays) || 30,
          description: newDescription
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setNewPlanType('');
        setNewPrice('');
        showToast(`Đã thêm gói cước "${newPlanType}" thành công!`);
        fetchPricing();
      } else {
        setErrorMsg(data.error || 'Lỗi khi thêm gói cước.');
      }
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    setNewPlanType(preset.plan_type);
    setNewPrice(String(preset.price));
    setNewVehicleType(preset.vehicle_type);
    setNewDurationDays(preset.duration_days);
    setNewDescription(preset.description);
  };

  // ------------------------------------------------------------
  // UPDATE PRICING PLAN
  // ------------------------------------------------------------
  const openEditModal = (p) => {
    setEditingPlan(p);
    setEditForm({
      plan_type: p.plan_type || '',
      price: String(p.price ?? ''),
      vehicle_type: p.vehicle_type || 'Ô tô',
      duration_days: p.duration_days || 30,
      description:
        p.description || 'Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp • Duyệt tự động AI OCR'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const response = await apiFetch(`/api/components/admin/AdminPricing/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: editForm.plan_type.trim(),
          price: parseFloat(editForm.price),
          vehicle_type: editForm.vehicle_type,
          duration_days: Number(editForm.duration_days) || 30,
          description: editForm.description
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setEditingPlan(null);
        showToast(`Đã cập nhật gói cước "${editForm.plan_type}"!`);
        fetchPricing();
      } else {
        setErrorMsg(data.error || 'Lỗi khi cập nhật gói cước.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdjustPrice = async (p, delta) => {
    const nextPrice = Math.max(0, Number(p.price || 0) + delta);
    const response = await apiFetch(`/api/components/admin/AdminPricing/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_type: p.plan_type,
        price: nextPrice,
        vehicle_type: p.vehicle_type,
        duration_days: p.duration_days,
        description: p.description
      })
    });
    if (response.ok) {
      showToast(`Đã điều chỉnh giá "${p.plan_type}" thành ${nextPrice.toLocaleString('vi-VN')} đ`);
      fetchPricing();
    }
  };

  const handleDuplicatePlan = async (p) => {
    const copyName = `${p.plan_type} (Bản sao)`;
    const response = await apiFetch('/api/components/admin/AdminPricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_type: copyName,
        price: Number(p.price || 0),
        vehicle_type: p.vehicle_type,
        duration_days: p.duration_days,
        description: p.description
      })
    });
    if (response.ok) {
      showToast(`Đã nhân bản gói "${copyName}"!`);
      fetchPricing();
    }
  };

  // ------------------------------------------------------------
  // DELETE PRICING PLAN
  // ------------------------------------------------------------
  const handleDeletePricing = async (p) => {
    if (window.confirm(`Xác nhận xóa gói cước "${p.plan_type}" (${Number(p.price).toLocaleString('vi-VN')} đ)?`)) {
      const response = await apiFetch(`/api/components/admin/AdminPricing/${p.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast(`Đã xóa gói cước "${p.plan_type}".`);
        fetchPricing();
      }
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONFIGURATION • SUBSCRIPTION PLANS & VIETQR / AI OCR PRICING</p>
          <h1>Quản lý Bảng giá & Chu kỳ Gói thuê<span>.</span></h1>
        </div>
        <button className="secondary" onClick={fetchPricing} disabled={loading}>
          {loading ? 'Đang tải...' : '↻ Làm mới bảng giá'}
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}
      >
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TỔNG SỐ GÓI CƯỚC</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '12px', color: '#059669' }}>Áp dụng cho VietQR & AI OCR</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>GÓI THUÊ Ô TÔ (CAR-CENTRIC)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {stats.carPlans}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Ràng buộc 1 Slot = 1 Xe cố định</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>GÓI THUÊ XE MÁY</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {stats.motoPlans}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Ra vào 24/7 nhận diện biển số AI</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>CHU KỲ & XÁC THỰC THANH TOÁN</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
            🤖 AI OCR Tự động
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Ghi nhận Ngày bắt đầu, Kết thúc & Giờ duyệt</div>
        </div>
      </div>

      <div className="records-panel">
        {errorMsg && <p className="error" role="alert">{errorMsg}</p>}
        {toastMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            ✓ {toastMsg}
          </div>
        )}

        {/* 1-Click Preset Plans Helper */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#065f46' }}>
            ⚡ Điền nhanh gói cước mẫu tiêu chuẩn:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PRESET_PLANS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="secondary"
                style={{
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  background: '#ffffff',
                  color: '#047857',
                  borderColor: '#6ee7b7'
                }}
                onClick={() => applyPreset(preset)}
              >
                ＋ {preset.plan_type.split('(')[0].trim()} ({preset.price.toLocaleString('vi-VN')}đ)
              </button>
            ))}
          </div>
        </div>

        {/* Add Pricing Form */}
        <form
          onSubmit={handleAddPricing}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '18px'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#0f172a' }}>
            ＋ Tạo gói cước mới
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
            <label>
              Tên gói cước *
              <input
                value={newPlanType}
                onChange={(e) => setNewPlanType(e.target.value)}
                placeholder="VD: Vé tháng Ô tô (Cố định 1 Slot = 1 Xe)"
                required
              />
            </label>
            <label>
              Đơn giá (VNĐ) *
              <input
                type="number"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="900000"
                required
              />
            </label>
            <label>
              Loại xe áp dụng
              <select value={newVehicleType} onChange={(e) => setNewVehicleType(e.target.value)}>
                <option value="Ô tô">🚗 Ô tô</option>
                <option value="Xe máy">🛵 Xe máy</option>
              </select>
            </label>
            <label>
              Chu kỳ (Số ngày)
              <input
                type="number"
                min="1"
                max="3650"
                value={newDurationDays}
                onChange={(e) => setNewDurationDays(e.target.value)}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '10px' }}>
            <label style={{ flex: 1, margin: 0 }}>
              Mô tả quyền lợi gói (Hiển thị khi khách hàng chọn gói & thanh toán)
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp..."
                style={{ marginBottom: 0 }}
              />
            </label>
            <button type="submit" className="primary admin-add-button" disabled={saving}>
              {saving ? 'Đang thêm...' : '＋ Thêm gói cước'}
            </button>
          </div>
        </form>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '12px'
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm theo tên gói cước hoặc quyền lợi..."
            style={{ flex: '1 1 260px', margin: 0 }}
          />
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{ margin: 0, padding: '8px 12px' }}
          >
            <option value="all">Tất cả loại xe</option>
            <option value="Ô tô">🚗 Chỉ gói Ô tô</option>
            <option value="Xe máy">🛵 Chỉ gói Xe máy</option>
          </select>
        </div>

        {/* Pricing CRUD Table */}
        <table className="records-table">
          <thead>
            <tr className="records-heading">
              <th className="records-cell">STT</th>
              <th className="records-cell">Gói cước & Quyền lợi</th>
              <th className="records-cell">Loại xe</th>
              <th className="records-cell">Chu kỳ thuê</th>
              <th className="records-cell">Đơn giá (VNĐ)</th>
              <th className="pricing-actions-heading">Thao tác CRUD</th>
            </tr>
          </thead>
          <tbody>
            {filteredPricing.length === 0 ? (
              <tr>
                <td colSpan="6" className="records-empty">
                  Chưa có cấu hình giá nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredPricing.map((p, idx) => (
                <tr key={p.id} className="records-row">
                  <td className="records-cell" style={{ fontWeight: 600, color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td className="pricing-plan-cell">
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.plan_type}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {p.description || 'Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp'}
                    </div>
                  </td>
                  <td className="records-cell">
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: p.vehicle_type === 'Xe máy' ? '#eff6ff' : '#ecfdf5',
                        color: p.vehicle_type === 'Xe máy' ? '#1d4ed8' : '#047857'
                      }}
                    >
                      {p.vehicle_type === 'Xe máy' ? '🛵 Xe máy' : '🚗 Ô tô'}
                    </span>
                  </td>
                  <td className="records-cell" style={{ fontSize: '13px', fontWeight: 600 }}>
                    {p.duration_days || 30} ngày
                  </td>
                  <td className="pricing-price-cell">
                    <div style={{ fontWeight: 800, color: '#059669', fontSize: '15px' }}>
                      {Number(p.price || 0).toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="text-button"
                        style={{ fontSize: '11px', padding: '1px 6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        onClick={() => handleQuickAdjustPrice(p, -50000)}
                        title="Giảm nhanh 50.000đ"
                      >
                        -50k
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        style={{ fontSize: '11px', padding: '1px 6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        onClick={() => handleQuickAdjustPrice(p, 50000)}
                        title="Tăng nhanh 50.000đ"
                      >
                        +50k
                      </button>
                    </div>
                  </td>
                  <td className="records-cell">
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-button"
                        style={{ fontWeight: 600, color: '#2563eb' }}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDuplicatePlan(p)}
                        className="text-button"
                        style={{ fontWeight: 600, color: '#059669' }}
                      >
                        📋 Nhân bản
                      </button>
                      <button
                        onClick={() => handleDeletePricing(p)}
                        className="text-button pricing-delete-button"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================ */}
      {/* EDIT PRICING PLAN MODAL                                      */}
      {/* ============================================================ */}
      {editingPlan && (
        <div className="dialog-overlay" onClick={() => !saving && setEditingPlan(null)}>
          <div
            className="dialog-content"
            style={{ maxWidth: '580px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="users-dialog-title" style={{ margin: 0 }}>
                ✏️ Chỉnh sửa Gói cước: {editingPlan.plan_type}
              </h3>
              <button className="slot-info-close" onClick={() => setEditingPlan(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <label>
                Tên gói cước *
                <input
                  value={editForm.plan_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, plan_type: e.target.value }))}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <label>
                  Đơn giá (VNĐ) *
                  <input
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                    required
                  />
                </label>

                <label>
                  Loại xe áp dụng
                  <select
                    value={editForm.vehicle_type}
                    onChange={(e) => setEditForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  >
                    <option value="Ô tô">🚗 Ô tô</option>
                    <option value="Xe máy">🛵 Xe máy</option>
                  </select>
                </label>

                <label>
                  Chu kỳ thuê (Ngày)
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={editForm.duration_days}
                    onChange={(e) => setEditForm((f) => ({ ...f, duration_days: e.target.value }))}
                  />
                </label>
              </div>

              <label>
                Mô tả quyền lợi gói
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>

              <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
                <button type="button" className="secondary" onClick={() => setEditingPlan(null)}>
                  Hủy
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : '💾 Lưu thay đổi gói cước'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
