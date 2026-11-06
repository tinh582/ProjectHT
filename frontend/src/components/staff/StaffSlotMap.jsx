import { groupSlotsByZone } from '../../lib/slots';
import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import SlotInfoDialog from '../shared/SlotInfoDialog';

export default function StaffSlotMap() {
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsByZone, setSlotsByZone] = useState({});
  const [expandedZoneIds, setExpandedZoneIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSlotForInfo, setSelectedSlotForInfo] = useState(null);

  // Filter & Search states for Staff
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchZonesAndSlots();
  }, []);

  const fetchZonesAndSlots = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/components/staff/StaffSlotMap');
      if (response.ok) {
        const { zones: zData, slots: sData } = await response.json();
        const safeZones = zData || [];
        const safeSlots = sData || [];
        setZones(safeZones);
        setSlots(safeSlots);
        setSlotsByZone(groupSlotsByZone(safeSlots));

        // Expand all zones by default so Staff immediately sees full slot details
        setExpandedZoneIds((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          const initial = {};
          safeZones.forEach((z) => {
            initial[z.id] = true;
          });
          return initial;
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Compute detailed overall & per-zone metrics
  const metrics = useMemo(() => {
    const totalZones = zones.length;
    const totalCapacity = zones.reduce((sum, z) => sum + Number(z.total_capacity || 0), 0);
    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === 'occupied').length;
    const rentedOnlySlots = slots.filter((s) => s.status === 'rented').length;
    const totalRentedSlots = occupiedSlots + rentedOnlySlots;
    const emptySlots = slots.filter((s) => !s.status || s.status === 'empty' || s.status === 'available').length;
    const maintenanceSlots = slots.filter((s) => s.status === 'maintenance').length;

    const baseTotal = totalSlots > 0 ? totalSlots : totalCapacity || 1;
    const rentalRate = totalSlots > 0 || totalCapacity > 0 ? Math.round((totalRentedSlots / baseTotal) * 100) : 0;
    const occupancyRate = totalSlots > 0 || totalCapacity > 0 ? Math.round((occupiedSlots / baseTotal) * 100) : 0;
    const emptyRate = totalSlots > 0 || totalCapacity > 0 ? Math.round((emptySlots / baseTotal) * 100) : 0;

    return {
      totalZones,
      totalCapacity,
      totalSlots,
      totalRentedSlots,
      occupiedSlots,
      rentedOnlySlots,
      emptySlots,
      maintenanceSlots,
      rentalRate,
      occupancyRate,
      emptyRate
    };
  }, [zones, slots]);

  const toggleZone = (zoneId) => {
    setExpandedZoneIds((prev) => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  const expandAll = () => {
    const next = {};
    zones.forEach((z) => {
      next[z.id] = true;
    });
    setExpandedZoneIds(next);
  };

  const collapseAll = () => {
    setExpandedZoneIds({});
  };

  const getZoneStats = (z) => {
    const zSlots = slotsByZone[z.id] || [];
    const totalSlots = zSlots.length;
    const totalCapacity = Number(z.total_capacity || totalSlots || 0);
    const occupied = zSlots.filter((s) => s.status === 'occupied').length;
    const rentedOnly = zSlots.filter((s) => s.status === 'rented').length;
    const totalRented = occupied + rentedOnly;
    const empty = zSlots.filter((s) => !s.status || s.status === 'empty' || s.status === 'available').length;
    const maintenance = zSlots.filter((s) => s.status === 'maintenance').length;
    const base = totalSlots > 0 ? totalSlots : totalCapacity || 1;
    const rentalRate = Math.round((totalRented / base) * 100);
    const occupancyRate = Math.round((occupied / base) * 100);
    return {
      totalCapacity,
      totalSlots,
      totalRented,
      occupied,
      rentedOnly,
      empty,
      maintenance,
      rentalRate,
      occupancyRate
    };
  };

  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (vehicleTypeFilter !== 'all' && z.vehicle_type !== vehicleTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchZoneName = (z.zone_name || '').toLowerCase().includes(q);
        const zSlots = slotsByZone[z.id] || [];
        const matchSlotOrPlate = zSlots.some(
          (s) =>
            (s.slot_name || '').toLowerCase().includes(q) ||
            (s.vehicles?.plate || '').toLowerCase().includes(q)
        );
        return matchZoneName || matchSlotOrPlate;
      }
      return true;
    });
  }, [zones, slotsByZone, vehicleTypeFilter, searchQuery]);

  const filterSlotItem = (slot) => {
    const st = slot.status || 'empty';
    if (statusFilter === 'empty' && st !== 'empty' && st !== 'available') return false;
    if (statusFilter === 'all_rented' && st !== 'rented' && st !== 'occupied') return false;
    if (statusFilter === 'rented' && st !== 'rented') return false;
    if (statusFilter === 'occupied' && st !== 'occupied') return false;
    if (statusFilter === 'maintenance' && st !== 'maintenance') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const zoneObj = zones.find((z) => String(z.id) === String(slot.zone_id));
      const zoneMatched = (zoneObj?.zone_name || '').toLowerCase().includes(q);
      if (!zoneMatched) {
        const matchName = (slot.slot_name || '').toLowerCase().includes(q);
        const matchPlate = (slot.vehicles?.plate || '').toLowerCase().includes(q);
        return matchName || matchPlate;
      }
    }
    return true;
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FACILITY MAP • REAL-TIME CAPACITY, RENTAL & OCCUPANCY</p>
          <h1>Sơ đồ Bãi đỗ & Thống kê Chi tiết Vị trí<span>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="secondary" onClick={expandAll}>
            ▼ Mở rộng tất cả khu
          </button>
          <button className="secondary" onClick={collapseAll}>
            ▲ Thu gọn tất cả
          </button>
          <button className="primary" onClick={fetchZonesAndSlots}>
            ↻ Làm mới sơ đồ
          </button>
        </div>
      </div>

      {/* 1. OVERALL KPI CARDS (6 SPECIFIC METRICS FOR STAFF) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: '12px',
          marginBottom: '18px'
        }}
      >
        <div className="panel" style={{ padding: '14px 16px', marginBottom: 0, borderLeft: '4px solid #0f172a' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>1. TỔNG SỐ Ô / SỨC CHỨA</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {metrics.totalSlots} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>/ {metrics.totalCapacity} chỗ</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            Trên tổng số <b>{metrics.totalZones} khu vực</b> hoạt động
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px', marginBottom: 0, borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '11.5px', color: '#1d4ed8', fontWeight: 700 }}>2. ĐÃ CHO THUÊ (TỔNG)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {metrics.totalRentedSlots} <span style={{ fontSize: '13px', fontWeight: 600 }}>ô ({metrics.rentalRate}%)</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            Gồm <b>{metrics.occupiedSlots}</b> đang đỗ + <b>{metrics.rentedOnlySlots}</b> giữ chỗ
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px', marginBottom: 0, borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '11.5px', color: '#b91c1c', fontWeight: 700 }}>3. ĐANG ĐỖ TRONG BÃI</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {metrics.occupiedSlots} <span style={{ fontSize: '13px', fontWeight: 600 }}>xe ({metrics.occupancyRate}%)</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            Xe thực tế đang có mặt tại ô đỗ
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px', marginBottom: 0, borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '11.5px', color: '#6d28d9', fontWeight: 700 }}>4. ĐÃ THUÊ (XE Ở NGOÀI)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
            {metrics.rentedOnlySlots} <span style={{ fontSize: '13px', fontWeight: 600 }}>ô giữ cố định</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            Đã có chủ thuê (1 Slot = 1 Xe), chờ xe vào
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px', marginBottom: 0, borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>5. Ô CÒN TRỐNG</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {metrics.emptySlots} <span style={{ fontSize: '13px', fontWeight: 600 }}>ô ({metrics.emptyRate}%)</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            Chưa có khách thuê • Sẵn sàng đăng ký mới
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 16px', marginBottom: 0, borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 700 }}>6. ĐANG BẢO TRÌ</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {metrics.maintenanceSlots} <span style={{ fontSize: '13px', fontWeight: 600 }}>ô khóa KT</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            Tạm ngưng nhận xe để kiểm tra kỹ thuật
          </div>
        </div>
      </div>

      {/* 2. DETAILED BREAKDOWN TABLE BY ZONE */}
      {zones.length > 0 && (
        <div className="panel" style={{ marginBottom: '18px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
              📊 Bảng Thống kê Chi tiết Số lượng theo Từng Khu vực (Thuê bao nhiêu • Đỗ bao nhiêu • Trống bao nhiêu)
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Cập nhật thời gian thực từ cơ sở dữ liệu
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0, fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Khu vực (Zone)</th>
                  <th>Loại xe</th>
                  <th>Sức chứa</th>
                  <th>Tổng số ô</th>
                  <th>🔵 Đã thuê (Tổng)</th>
                  <th>🔴 Đang đỗ (Trong bãi)</th>
                  <th>🟣 Đã thuê (Ngoài bãi)</th>
                  <th>🟢 Còn trống</th>
                  <th>🟠 Bảo trì</th>
                  <th>Tỷ lệ Thuê / Đỗ thực tế</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => {
                  const st = getZoneStats(z);
                  return (
                    <tr key={z.id}>
                      <td><strong>{z.zone_name}</strong></td>
                      <td>{z.vehicle_type === 'Ô tô' ? '🚗 Ô tô' : '🛵 Xe máy'}</td>
                      <td><b>{st.totalCapacity}</b> chỗ</td>
                      <td><b>{st.totalSlots}</b> ô</td>
                      <td style={{ color: '#2563eb', fontWeight: 700 }}>{st.totalRented} ô ({st.rentalRate}%)</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{st.occupied} xe ({st.occupancyRate}%)</td>
                      <td style={{ color: '#7c3aed', fontWeight: 700 }}>{st.rentedOnly} ô</td>
                      <td style={{ color: '#059669', fontWeight: 700 }}>{st.empty} ô</td>
                      <td style={{ color: '#d97706', fontWeight: 700 }}>{st.maintenance} ô</td>
                      <td style={{ minWidth: '150px' }}>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                          <div
                            style={{ width: `${st.occupancyRate}%`, background: '#dc2626' }}
                            title={`Đang đỗ: ${st.occupied} xe`}
                          />
                          <div
                            style={{
                              width: `${Math.max(0, st.rentalRate - st.occupancyRate)}%`,
                              background: '#3b82f6'
                            }}
                            title={`Đã thuê (ngoài bãi): ${st.rentedOnly} ô`}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          Thuê: <b>{st.totalRented}/{st.totalSlots || st.totalCapacity}</b> • Đỗ: <b>{st.occupied}</b> • Trống: <b>{st.empty}</b>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE SLOT MAP BY ZONE */}
      <div className="panel">
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
            marginBottom: '16px'
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm mã vị trí (VD: A-01) hoặc biển số xe (VD: 51A-888.88)..."
            style={{ flex: '1 1 240px', margin: 0 }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
              style={{ margin: 0, padding: '8px 12px' }}
            >
              <option value="all">Tất cả loại phương tiện</option>
              <option value="Ô tô">🚗 Khu vực Ô tô</option>
              <option value="Xe máy">🛵 Khu vực Xe máy</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ margin: 0, padding: '8px 12px' }}
            >
              <option value="all">Tất cả trạng thái ({metrics.totalSlots} ô)</option>
              <option value="empty">🟢 Chỉ hiện Ô còn trống ({metrics.emptySlots} ô)</option>
              <option value="all_rented">🔵 Tất cả Ô đã thuê ({metrics.totalRentedSlots} ô)</option>
              <option value="occupied">🔴 Đang đỗ trong bãi ({metrics.occupiedSlots} xe)</option>
              <option value="rented">🟣 Đã thuê - Xe ở ngoài ({metrics.rentedOnlySlots} ô)</option>
              <option value="maintenance">🟠 Đang bảo trì ({metrics.maintenanceSlots} ô)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Đang tải sơ đồ bãi đỗ...</p>
        ) : (
          <div className="panel-flex">
            {filteredZones.map((z) => {
              const rawSlots = slotsByZone[z.id] || [];
              const visibleSlots = rawSlots.filter(filterSlotItem);
              const hasSlots = rawSlots.length > 0;
              const isExpanded = Boolean(expandedZoneIds[z.id]);
              const st = getZoneStats(z);

              return (
                <div key={z.id} className="zone-card" style={{ border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                  <div className="zone-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div className="zone-heading-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <h3 className="zone-title">{z.zone_name}</h3>
                        <span className="zone-type-badge">
                          {z.vehicle_type === 'Ô tô' ? '🚗 Ô tô' : '🛵 Xe máy'}
                        </span>
                        <span
                          style={{
                            fontSize: '11.5px',
                            background: '#f1f5f9',
                            color: '#0f172a',
                            padding: '2px 10px',
                            borderRadius: '999px',
                            fontWeight: 700
                          }}
                        >
                          Sức chứa: {st.totalCapacity} chỗ • Sơ đồ: {st.totalSlots} ô
                        </span>
                      </div>

                      {/* Specific Per-Zone Breakdown Badges */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginTop: '8px',
                          fontSize: '12px'
                        }}
                      >
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}
                        >
                          🔵 Đã thuê: {st.totalRented}/{st.totalSlots || st.totalCapacity} ô ({st.rentalRate}%)
                        </span>
                        <span
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}
                        >
                          🔴 Đang đỗ trong bãi: {st.occupied} xe ({st.occupancyRate}%)
                        </span>
                        <span
                          style={{
                            background: '#f5f3ff',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}
                        >
                          🟣 Đã thuê (Xe ở ngoài): {st.rentedOnly} ô
                        </span>
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}
                        >
                          🟢 Còn trống: {st.empty} ô
                        </span>
                        {st.maintenance > 0 && (
                          <span
                            style={{
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}
                          >
                            🟠 Bảo trì: {st.maintenance} ô
                          </span>
                        )}
                      </div>
                    </div>

                    {hasSlots && (
                      <button
                        onClick={() => toggleZone(z.id)}
                        className="secondary zone-action-button"
                      >
                        {isExpanded ? '▲ Thu gọn Bản đồ Slot' : `🗺️ Xem Bản đồ Slot (${rawSlots.length} ô)`}
                      </button>
                    )}
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
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                          Hiển thị {visibleSlots.length}/{rawSlots.length} vị trí — Nhấn vào ô đỗ bất kỳ để xem Chủ xe, SĐT, Biển số & Giờ ra/vào
                        </div>
                        <div className="slot-legend" style={{ margin: 0 }}>
                          <span className="legend-item">
                            <div className="legend-box empty"></div> Trống ({st.empty})
                          </span>
                          <span className="legend-item">
                            <div className="legend-box rented"></div> Đã thuê - Chưa vào ({st.rentedOnly})
                          </span>
                          <span className="legend-item">
                            <div className="legend-box occupied"></div> Đang đỗ trong bãi ({st.occupied})
                          </span>
                        </div>
                      </div>

                      <div className="slot-grid">
                        {visibleSlots.map((slot) => {
                          let statusClass = 'empty';
                          let statusLabel = 'Trống';
                          if (slot.status === 'rented') {
                            statusClass = 'rented';
                            statusLabel = 'Đã thuê (Ngoài bãi)';
                          } else if (slot.status === 'occupied') {
                            statusClass = 'occupied';
                            statusLabel = 'Đang đỗ';
                          } else if (slot.status === 'maintenance') {
                            statusClass = 'occupied';
                            statusLabel = 'Bảo trì';
                          }

                          return (
                            <div
                              key={slot.id}
                              onClick={() => setSelectedSlotForInfo(slot)}
                              className={`slot-box ${statusClass} clickable`}
                              style={
                                slot.status === 'maintenance'
                                  ? { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }
                                  : undefined
                              }
                              title={
                                slot.vehicles
                                  ? `${slot.slot_name} (${statusLabel}) • Biển số: ${slot.vehicles.plate}`
                                  : `${slot.slot_name} (${statusLabel})`
                              }
                            >
                              <b className="zone-slot-name">{slot.slot_name}</b>
                              {slot.vehicles ? (
                                <span className="zone-slot-plate">🔒 {slot.vehicles.plate}</span>
                              ) : (
                                <span className="zone-slot-plate" style={{ opacity: 0.75 }}>
                                  {statusLabel}
                                </span>
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
              <p className="zone-empty-message">Không tìm thấy khu vực hoặc vị trí đỗ nào khớp với bộ lọc.</p>
            )}
          </div>
        )}
      </div>

      {selectedSlotForInfo && (
        <SlotInfoDialog
          slot={selectedSlotForInfo}
          onClose={() => setSelectedSlotForInfo(null)}
        />
      )}
    </div>
  );
}
