import { groupSlotsByZone } from '../../lib/slots';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import SlotInfoDialog from '../shared/SlotInfoDialog';

const DEFAULT_INFRA = {
  drainage_status: 'Hoạt động tốt • Bơm chống ngập 3 cấp (Khô ráo 100%)',
  sensor_status: 'Hoạt động • Cảm biến siêu âm IoT từng ô',
  cctv_coverage: 'Camera AI 4K góc rộng 24/7',
  lighting_status: 'Đèn LED cảm ứng & Thông gió Jetfan'
};

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [slotsByZone, setSlotsByZone] = useState({});
  const [allVehicles, setAllVehicles] = useState([]);
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const [selectedSlotForInfo, setSelectedSlotForInfo] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filter & Search
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchZone, setSearchZone] = useState('');
  const [slotFilter, setSlotFilter] = useState('all');

  // 1. CREATE ZONE FORM
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({
    zone_name: '',
    vehicle_type: 'Ô tô',
    total_capacity: 20,
    ...DEFAULT_INFRA
  });

  // 2. EDIT ZONE MODAL (UPDATE ZONE + INFRASTRUCTURE)
  const [editingZone, setEditingZone] = useState(null);
  const [editZoneForm, setEditZoneForm] = useState({
    zone_name: '',
    vehicle_type: 'Ô tô',
    total_capacity: 20,
    ...DEFAULT_INFRA
  });
  const [zoneSaving, setZoneSaving] = useState(false);

  // 3. INDIVIDUAL SLOT CRUD MODAL (ADD / EDIT / ASSIGN 1 SLOT = 1 XE / DELETE SLOT)
  const [editingSlot, setEditingSlot] = useState(null);
  const [editSlotForm, setEditSlotForm] = useState({
    slot_name: '',
    status: 'empty',
    vehicle_id: ''
  });
  const [addingSlotZone, setAddingSlotZone] = useState(null);
  const [newSlotName, setNewSlotName] = useState('');
  const [slotSaving, setSlotSaving] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const fetchAllData = async () => {
    setErrorMsg('');
    await Promise.all([fetchZones(), fetchSlots(), fetchVehiclesList()]);
  };

  const fetchZones = async () => {
    const response = await apiFetch('/api/components/admin/AdminZones/zones');
    if (response.ok) {
      const data = await response.json();
      setZones(data || []);
      if (data?.length > 0 && !expandedZoneId) {
        setExpandedZoneId(data[0].id);
      }
    }
  };

  const fetchSlots = async () => {
    const response = await apiFetch('/api/components/admin/AdminZones/slots');
    if (response.ok) {
      const data = await response.json();
      if (data) {
        setSlotsByZone(groupSlotsByZone(data));
      }
    }
  };

  const fetchVehiclesList = async () => {
    try {
      const response = await apiFetch('/api/components/admin/AdminZones/vehicles-list');
      if (response.ok) {
        setAllVehicles((await response.json()) || []);
      }
    } catch {
      // Optional list
    }
  };

  // Summary KPIs
  const summaryStats = useMemo(() => {
    const allSlots = Object.values(slotsByZone).flat();
    const totalZones = zones.length;
    const totalCapacity = zones.reduce((acc, z) => acc + Number(z.total_capacity || 0), 0);
    const emptySlots = allSlots.filter((s) => !s.status || s.status === 'empty' || s.status === 'available').length;
    const occupiedOrRented = allSlots.filter((s) => s.status === 'rented' || s.status === 'occupied').length;
    return { totalZones, totalCapacity, totalSlotsCreated: allSlots.length, emptySlots, occupiedOrRented };
  }, [zones, slotsByZone]);

  // Filtered zones
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (typeFilter !== 'all' && z.vehicle_type !== typeFilter) return false;
      if (searchZone.trim()) {
        return (z.zone_name || '').toLowerCase().includes(searchZone.toLowerCase().trim());
      }
      return true;
    });
  }, [zones, typeFilter, searchZone]);

  // ------------------------------------------------------------
  // ZONE CRUD HANDLERS
  // ------------------------------------------------------------
  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneForm.zone_name || !newZoneForm.total_capacity) return;
    setZoneSaving(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/api/components/admin/AdminZones/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newZoneForm,
          total_capacity: parseInt(newZoneForm.total_capacity, 10)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMsg(data.error || 'Không thể tạo khu vực đỗ xe.');
        return;
      }
      setShowAddZoneModal(false);
      setNewZoneForm({
        zone_name: '',
        vehicle_type: 'Ô tô',
        total_capacity: 20,
        ...DEFAULT_INFRA
      });
      showToast(`Đã tạo khu vực "${newZoneForm.zone_name}" thành công!`);
      fetchAllData();
    } finally {
      setZoneSaving(false);
    }
  };

  const openEditZone = (z) => {
    setEditingZone(z);
    setEditZoneForm({
      zone_name: z.zone_name || '',
      vehicle_type: z.vehicle_type || 'Ô tô',
      total_capacity: z.total_capacity || 20,
      drainage_status: z.drainage_status || DEFAULT_INFRA.drainage_status,
      sensor_status: z.sensor_status || DEFAULT_INFRA.sensor_status,
      cctv_coverage: z.cctv_coverage || DEFAULT_INFRA.cctv_coverage,
      lighting_status: z.lighting_status || DEFAULT_INFRA.lighting_status
    });
  };

  const handleSaveEditZone = async (e) => {
    e.preventDefault();
    if (!editingZone) return;
    setZoneSaving(true);
    setErrorMsg('');
    try {
      const response = await apiFetch(`/api/components/admin/AdminZones/zones/${editingZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editZoneForm,
          total_capacity: parseInt(editZoneForm.total_capacity, 10)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMsg(data.error || 'Lỗi khi cập nhật khu vực.');
        return;
      }
      setEditingZone(null);
      showToast(`Đã cập nhật khu vực "${editZoneForm.zone_name}" & hạ tầng kỹ thuật!`);
      fetchAllData();
    } finally {
      setZoneSaving(false);
    }
  };

  const handleDeleteZone = async (z) => {
    if (
      window.confirm(
        `Xác nhận xóa khu vực "${z.zone_name}"? Thao tác này sẽ xóa toàn bộ danh sách ô đỗ bên trong khu vực.`
      )
    ) {
      const response = await apiFetch(`/api/components/admin/AdminZones/zones/${z.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast(`Đã xóa khu vực "${z.zone_name}".`);
        fetchAllData();
      }
    }
  };

  const generateMissingSlots = async (zone) => {
    if (window.confirm(`Khởi tạo tự động ${zone.total_capacity} vị trí đỗ tiêu chuẩn cho ${zone.zone_name}?`)) {
      const response = await apiFetch(`/api/components/admin/AdminZones/zones/${zone.id}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_name: zone.zone_name, total_capacity: zone.total_capacity })
      });
      if (response.ok) {
        setExpandedZoneId(zone.id);
        showToast(`Đã tạo ${zone.total_capacity} ô đỗ cho ${zone.zone_name}!`);
        fetchSlots();
      }
    }
  };

  // ------------------------------------------------------------
  // INDIVIDUAL SLOT CRUD HANDLERS (1 SLOT = 1 XE)
  // ------------------------------------------------------------
  const openEditSlotModal = (slot, zone) => {
    setEditingSlot({ ...slot, zone });
    setEditSlotForm({
      slot_name: slot.slot_name || '',
      status: slot.status || 'empty',
      vehicle_id: slot.vehicle_id || ''
    });
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!editingSlot) return;
    setSlotSaving(true);
    try {
      const response = await apiFetch(`/api/components/admin/AdminZones/slots/${editingSlot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_name: editSlotForm.slot_name,
          status: editSlotForm.status,
          vehicle_id: editSlotForm.vehicle_id || null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error || 'Lỗi khi cập nhật ô đỗ.');
        return;
      }
      setEditingSlot(null);
      showToast(`Đã cập nhật ô đỗ ${editSlotForm.slot_name} thành công!`);
      fetchAllData();
    } finally {
      setSlotSaving(false);
    }
  };

  const handleReleaseSlot = async (slot) => {
    if (!window.confirm(`Giải phóng ô đỗ ${slot.slot_name} về trạng thái Trống (Empty)?`)) return;
    const response = await apiFetch(`/api/components/admin/AdminZones/slots/${slot.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_name: slot.slot_name,
        status: 'empty',
        vehicle_id: null
      })
    });
    if (response.ok) {
      setEditingSlot(null);
      showToast(`Đã giải phóng ô đỗ ${slot.slot_name}!`);
      fetchAllData();
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Xác nhận xóa vĩnh viễn ô đỗ "${slot.slot_name}" khỏi sơ đồ khu vực?`)) return;
    const response = await apiFetch(`/api/components/admin/AdminZones/slots/${slot.id}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      setEditingSlot(null);
      showToast(`Đã xóa ô đỗ ${slot.slot_name}.`);
      fetchAllData();
    }
  };

  const handleAddSingleSlot = async (e) => {
    e.preventDefault();
    if (!addingSlotZone || !newSlotName.trim()) return;
    setSlotSaving(true);
    try {
      const response = await apiFetch(`/api/components/admin/AdminZones/zones/${addingSlotZone.id}/slot-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_name: newSlotName.trim(), status: 'empty' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error || 'Lỗi khi thêm ô đỗ mới.');
        return;
      }
      setAddingSlotZone(null);
      setNewSlotName('');
      showToast(`Đã thêm ô đỗ "${newSlotName.trim()}" vào ${addingSlotZone.zone_name}!`);
      fetchAllData();
    } finally {
      setSlotSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">FACILITY • MAP, SLOTS (1 SLOT = 1 XE) & DRAINAGE INFRASTRUCTURE</p>
          <h1>Quản lý Sơ đồ Bãi đỗ & Hạ tầng Kỹ thuật<span>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary" onClick={fetchAllData}>
            ↻ Làm mới sơ đồ
          </button>
          <button className="primary" onClick={() => setShowAddZoneModal(true)}>
            ＋ Thêm Khu vực mới
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}
      >
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TỔNG KHU VỰC (ZONES)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {summaryStats.totalZones}
          </div>
          <div style={{ fontSize: '12px', color: '#059669' }}>Sức chứa thiết kế: {summaryStats.totalCapacity} xe</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Ô ĐỖ CÒN TRỐNG THỜI GIAN THỰC</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {summaryStats.emptySlots}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Sẵn sàng khóa cố định 1 Slot = 1 Xe</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Ô ĐÃ THUÊ / ĐANG CÓ XE ĐỖ</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {summaryStats.occupiedOrRented}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>0% Overbooking • Ràng buộc biển số</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>HỆ THỐNG THOÁT NƯỚC & CẢM BIẾN</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
            💧 Khô ráo 100%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Bơm chống ngập 3 cấp • Camera AI 24/7</div>
        </div>
      </div>

      <div className="panel">
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

        {/* Filter & Search Bar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginBottom: '18px'
          }}
        >
          <input
            type="text"
            value={searchZone}
            onChange={(e) => setSearchZone(e.target.value)}
            placeholder="🔍 Tìm kiếm khu vực (VD: Khu A, Hầm B1)..."
            style={{ flex: '1 1 240px', margin: 0 }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ margin: 0, padding: '8px 12px' }}
            >
              <option value="all">Tất cả loại phương tiện</option>
              <option value="Ô tô">🚗 Khu vực Ô tô</option>
              <option value="Xe máy">🛵 Khu vực Xe máy</option>
            </select>

            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              style={{ margin: 0, padding: '8px 12px' }}
            >
              <option value="all">Hiển thị tất cả Slot trên bản đồ</option>
              <option value="empty">🟢 Chỉ hiện ô Trống (Empty)</option>
              <option value="rented">🔵 Chỉ hiện ô Đã thuê (Rented)</option>
              <option value="occupied">🔴 Chỉ hiện ô Đang đỗ (Occupied)</option>
              <option value="maintenance">🟠 Chỉ hiện ô Bảo trì (Maintenance)</option>
            </select>
          </div>
        </div>

        {/* Zones List */}
        <div className="panel-flex">
          {filteredZones.map((z) => {
            const rawSlots = slotsByZone[z.id] || [];
            const hasSlots = rawSlots.length > 0;
            const isExpanded = expandedZoneId === z.id;
            const visibleSlots = rawSlots.filter((s) => {
              if (slotFilter === 'all') return true;
              const st = s.status || 'empty';
              return st === slotFilter;
            });

            return (
              <div key={z.id} className="zone-card" style={{ border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                <div className="zone-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  <div className="zone-details">
                    <div className="zone-heading-row">
                      <h3 className="zone-title">{z.zone_name}</h3>
                      <span className="zone-type-badge">
                        {z.vehicle_type === 'Ô tô' ? '🚗 Ô tô' : '🛵 Xe máy'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontWeight: 700
                        }}
                      >
                        🔒 1 Slot = 1 Xe cố định
                      </span>
                    </div>
                    <p className="zone-summary" style={{ marginTop: '4px' }}>
                      Sức chứa thiết kế: <b>{z.total_capacity}</b> | Số ô trên sơ đồ: <b>{rawSlots.length}</b> | Đang sử dụng:{' '}
                      <b>{z.current_occupancy || rawSlots.filter((s) => s.status && s.status !== 'empty').length}</b>
                    </p>

                    {/* Technical Infrastructure Badges */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginTop: '8px',
                        fontSize: '11.5px'
                      }}
                    >
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        💧 <b>Thoát nước:</b> {z.drainage_status || DEFAULT_INFRA.drainage_status}
                      </span>
                      <span
                        style={{
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        📡 <b>Cảm biến:</b> {z.sensor_status || DEFAULT_INFRA.sensor_status}
                      </span>
                      <span
                        style={{
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        📹 <b>Camera AI:</b> {z.cctv_coverage || DEFAULT_INFRA.cctv_coverage}
                      </span>
                    </div>
                  </div>

                  <div className="zone-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {!hasSlots ? (
                      <button
                        onClick={() => generateMissingSlots(z)}
                        className="primary zone-action-button"
                      >
                        ⚡ Tạo tự động {z.total_capacity} Slot
                      </button>
                    ) : (
                      <button
                        onClick={() => setExpandedZoneId(isExpanded ? null : z.id)}
                        className="secondary zone-action-button"
                      >
                        {isExpanded ? '▲ Thu gọn Bản đồ Slot' : `🗺️ Mở Bản đồ Slot (${rawSlots.length})`}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setAddingSlotZone(z);
                        const nextNum = String(rawSlots.length + 1).padStart(2, '0');
                        setNewSlotName(`${z.zone_name.replace(/\s+/g, '')}-${nextNum}`);
                      }}
                      className="secondary zone-action-button"
                      style={{ color: '#059669', borderColor: '#a7f3d0' }}
                    >
                      ＋ Thêm Slot lẻ
                    </button>
                    <button
                      onClick={() => openEditZone(z)}
                      className="secondary zone-action-button"
                    >
                      ✏️ Sửa Khu vực & Hạ tầng
                    </button>
                    <button
                      onClick={() => handleDeleteZone(z)}
                      className="secondary zone-delete-button"
                    >
                      🗑️ Xóa Khu vực
                    </button>
                  </div>
                </div>

                {isExpanded && hasSlots && (
                  <div className="slot-map-container">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginBottom: '10px'
                      }}
                    >
                      <h4 className="zone-map-title" style={{ margin: 0 }}>
                        Sơ đồ mặt bằng {z.zone_name} ({visibleSlots.length}/{rawSlots.length} vị trí) — Nhấn vào bất kỳ ô nào để Sửa / Gán xe (1 Slot = 1 Xe) / Giải phóng / Xóa
                      </h4>
                      <div className="slot-legend" style={{ margin: 0 }}>
                        <span className="legend-item"><div className="legend-box empty"></div> Trống (Empty)</span>
                        <span className="legend-item"><div className="legend-box rented"></div> Đã thuê cố định (Rented)</span>
                        <span className="legend-item"><div className="legend-box occupied"></div> Đang đỗ trong bãi (Occupied)</span>
                      </div>
                    </div>

                    <div className="slot-grid">
                      {visibleSlots.map((slot) => {
                        let statusClass = 'empty';
                        if (slot.status === 'rented') statusClass = 'rented';
                        if (slot.status === 'occupied') statusClass = 'occupied';
                        if (slot.status === 'maintenance') statusClass = 'occupied';

                        return (
                          <div
                            key={slot.id}
                            onClick={() => openEditSlotModal(slot, z)}
                            className={`slot-box ${statusClass} clickable`}
                            style={
                              slot.status === 'maintenance'
                                ? { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }
                                : undefined
                            }
                            title="Nhấn để Sửa ô đỗ, Gán biển số cố định (1 Slot = 1 Xe), hoặc Xem chi tiết"
                          >
                            <b className="zone-slot-name">{slot.slot_name}</b>
                            {slot.vehicles ? (
                              <span className="zone-slot-plate">🔒 {slot.vehicles.plate}</span>
                            ) : slot.status === 'maintenance' ? (
                              <span className="zone-slot-plate">🛠️ Bảo trì</span>
                            ) : (
                              <span className="zone-slot-plate" style={{ opacity: 0.7 }}>Trống</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredZones.length === 0 && (
            <p className="zone-empty-message">Không tìm thấy khu vực đỗ xe nào khớp với bộ lọc.</p>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ADD NEW ZONE + TECHNICAL INFRASTRUCTURE             */}
      {/* ============================================================ */}
      {showAddZoneModal && (
        <div className="dialog-overlay" onClick={() => !zoneSaving && setShowAddZoneModal(false)}>
          <div
            className="dialog-content"
            style={{ maxWidth: '620px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="users-dialog-title">＋ Thêm Khu vực Đỗ xe & Cấu hình Hạ tầng</h3>
            <form onSubmit={handleAddZone}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <label>
                  Tên khu vực *
                  <input
                    value={newZoneForm.zone_name}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, zone_name: e.target.value }))}
                    placeholder="VD: Hầm B1 - Khu A2"
                    required
                  />
                </label>
                <label>
                  Loại phương tiện *
                  <select
                    value={newZoneForm.vehicle_type}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  >
                    <option value="Ô tô">🚗 Ô tô</option>
                    <option value="Xe máy">🛵 Xe máy</option>
                  </select>
                </label>
                <label>
                  Sức chứa (Số Slot) *
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newZoneForm.total_capacity}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, total_capacity: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <label>
                  💧 Hệ thống thoát nước chống ngập
                  <input
                    value={newZoneForm.drainage_status}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, drainage_status: e.target.value }))}
                  />
                </label>
                <label>
                  📡 Trạng thái cảm biến siêu âm IoT
                  <input
                    value={newZoneForm.sensor_status}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, sensor_status: e.target.value }))}
                  />
                </label>
                <label>
                  📹 Độ phủ Camera AI giám sát
                  <input
                    value={newZoneForm.cctv_coverage}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, cctv_coverage: e.target.value }))}
                  />
                </label>
                <label>
                  💡 Hệ thống chiếu sáng & thông gió
                  <input
                    value={newZoneForm.lighting_status}
                    onChange={(e) => setNewZoneForm((f) => ({ ...f, lighting_status: e.target.value }))}
                  />
                </label>
              </div>

              <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
                <button type="button" className="secondary" onClick={() => setShowAddZoneModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary" disabled={zoneSaving}>
                  {zoneSaving ? 'Đang tạo...' : 'Tạo Khu vực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT ZONE & INFRASTRUCTURE                          */}
      {/* ============================================================ */}
      {editingZone && (
        <div className="dialog-overlay" onClick={() => !zoneSaving && setEditingZone(null)}>
          <div
            className="dialog-content"
            style={{ maxWidth: '620px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="users-dialog-title">✏️ Sửa Khu vực & Hạ tầng Kỹ thuật: {editingZone.zone_name}</h3>
            <form onSubmit={handleSaveEditZone}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <label>
                  Tên khu vực *
                  <input
                    value={editZoneForm.zone_name}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, zone_name: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Loại phương tiện *
                  <select
                    value={editZoneForm.vehicle_type}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  >
                    <option value="Ô tô">🚗 Ô tô</option>
                    <option value="Xe máy">🛵 Xe máy</option>
                  </select>
                </label>
                <label>
                  Sức chứa (Tổng số Slot) *
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={editZoneForm.total_capacity}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, total_capacity: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <label>
                  💧 Hệ thống thoát nước chống ngập
                  <input
                    value={editZoneForm.drainage_status}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, drainage_status: e.target.value }))}
                  />
                </label>
                <label>
                  📡 Trạng thái cảm biến siêu âm IoT
                  <input
                    value={editZoneForm.sensor_status}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, sensor_status: e.target.value }))}
                  />
                </label>
                <label>
                  📹 Độ phủ Camera AI giám sát
                  <input
                    value={editZoneForm.cctv_coverage}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, cctv_coverage: e.target.value }))}
                  />
                </label>
                <label>
                  💡 Hệ thống chiếu sáng & thông gió
                  <input
                    value={editZoneForm.lighting_status}
                    onChange={(e) => setEditZoneForm((f) => ({ ...f, lighting_status: e.target.value }))}
                  />
                </label>
              </div>

              <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
                <button type="button" className="secondary" onClick={() => setEditingZone(null)}>
                  Hủy
                </button>
                <button type="submit" className="primary" disabled={zoneSaving}>
                  {zoneSaving ? 'Đang lưu...' : '💾 Lưu thay đổi khu vực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: ADD SINGLE SLOT TO ZONE                             */}
      {/* ============================================================ */}
      {addingSlotZone && (
        <div className="dialog-overlay" onClick={() => !slotSaving && setAddingSlotZone(null)}>
          <div className="dialog-content sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="users-dialog-title">＋ Thêm Ô đỗ mới vào {addingSlotZone.zone_name}</h3>
            <form onSubmit={handleAddSingleSlot}>
              <label>
                Mã vị trí đỗ (Slot Name) *
                <input
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  placeholder="VD: A1-25"
                  required
                  autoFocus
                />
              </label>
              <div className="users-dialog-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="secondary" onClick={() => setAddingSlotZone(null)}>
                  Hủy
                </button>
                <button type="submit" className="primary" disabled={slotSaving}>
                  {slotSaving ? 'Đang thêm...' : 'Thêm Ô đỗ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: INDIVIDUAL SLOT CRUD (EDIT / 1 SLOT = 1 XE / DELETE)*/}
      {/* ============================================================ */}
      {editingSlot && (
        <div className="dialog-overlay" onClick={() => !slotSaving && setEditingSlot(null)}>
          <div
            className="dialog-content"
            style={{ maxWidth: '560px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 className="users-dialog-title" style={{ margin: 0 }}>
                🅿️ Quản lý Vị trí đỗ: {editingSlot.slot_name} ({editingSlot.zone?.zone_name})
              </h3>
              <button className="slot-info-close" onClick={() => setEditingSlot(null)}>✕</button>
            </div>

            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '12px'
              }}
            >
              🔒 <b>Ràng buộc 1 Slot = 1 Xe:</b> Mỗi vị trí đỗ chỉ gắn duy nhất với 1 biển số xe tại một thời điểm. Nếu bạn gán một xe đang ở ô khác sang ô này, ô cũ sẽ tự động được giải phóng.
            </div>

            <form onSubmit={handleSaveSlot}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Mã ô đỗ (Slot Name) *
                  <input
                    value={editSlotForm.slot_name}
                    onChange={(e) => setEditSlotForm((f) => ({ ...f, slot_name: e.target.value }))}
                    required
                  />
                </label>

                <label>
                  Trạng thái ô đỗ
                  <select
                    value={editSlotForm.status}
                    onChange={(e) => setEditSlotForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="empty">🟢 Trống (Empty)</option>
                    <option value="rented">🔵 Đã thuê cố định (Rented)</option>
                    <option value="occupied">🔴 Đang có xe đỗ (Occupied)</option>
                    <option value="maintenance">🟠 Đang bảo trì (Maintenance)</option>
                  </select>
                </label>
              </div>

              <label style={{ marginTop: '12px', display: 'block' }}>
                Gán cố định cho phương tiện (1 Slot = 1 Xe)
                <select
                  value={editSlotForm.vehicle_id || ''}
                  onChange={(e) => {
                    const vid = e.target.value;
                    setEditSlotForm((f) => ({
                      ...f,
                      vehicle_id: vid,
                      status: vid ? (f.status === 'empty' ? 'rented' : f.status) : 'empty'
                    }));
                  }}
                >
                  <option value="">-- Không gán xe (Ô trống) --</option>
                  {allVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.type === 'car' || v.type === 'Ô tô' ? 'Ô tô' : 'Xe máy'}{' '}
                      {v.brand ? `(${v.brand} ${v.model || ''})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '18px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingSlot.vehicle_id && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        const target = editingSlot;
                        setEditingSlot(null);
                        setSelectedSlotForInfo(target);
                      }}
                    >
                      👁️ Xem chủ xe
                    </button>
                  )}
                  {(editingSlot.status !== 'empty' || editingSlot.vehicle_id) && (
                    <button
                      type="button"
                      className="secondary"
                      style={{ color: '#059669', borderColor: '#a7f3d0' }}
                      onClick={() => handleReleaseSlot(editingSlot)}
                    >
                      🔓 Giải phóng ô
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    style={{ color: '#dc2626', borderColor: '#fecaca' }}
                    onClick={() => handleDeleteSlot(editingSlot)}
                  >
                    🗑️ Xóa ô này
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="secondary" onClick={() => setEditingSlot(null)}>
                    Đóng
                  </button>
                  <button type="submit" className="primary" disabled={slotSaving}>
                    {slotSaving ? 'Đang lưu...' : '💾 Lưu ô đỗ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSlotForInfo && (
        <SlotInfoDialog
          slot={selectedSlotForInfo}
          onClose={() => setSelectedSlotForInfo(null)}
        />
      )}
    </div>
  );
}
