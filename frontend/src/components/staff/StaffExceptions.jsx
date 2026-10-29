import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';

const INCIDENT_TYPES = [
  { value: 'WRONG_SLOT_OCCUPIED', label: '🅿️ Đỗ sai ô cố định (Vi phạm 1 Slot = 1 Xe)' },
  { value: 'AI_PLATE_BLUR', label: '📷 Camera AI khó đọc biển số (Mờ / Mưa bùn / Lóa sáng)' },
  { value: 'MANUAL_BARRIER_OVERRIDE', label: '🚧 Kẹt thanh chắn Barie / Mở thủ công' },
  { value: 'INFRA_DRAINAGE_ALERT', label: '💧 Cảnh báo cảm biến / Rãnh thoát nước tầng hầm' },
  { value: 'OVERSTAY_SESSION', label: '⏱️ Xe đỗ quá hạn > 24h / Quên đóng phiên ra' }
];

export default function StaffExceptions() {
  const [exceptions, setExceptions] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Filters
  const [searchPlate, setSearchPlate] = useState('');
  const [incidentFilter, setIncidentFilter] = useState('all');

  // Create / Edit Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [incidentForm, setIncidentForm] = useState({
    plate: '',
    incident_type: 'WRONG_SLOT_OCCUPIED',
    severity: 'medium',
    title: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchExceptions(), fetchIncidents()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExceptions = async () => {
    const response = await apiFetch('/api/components/staff/StaffExceptions');
    if (response.ok) {
      const data = await response.json();
      setExceptions(data || []);
    }
  };

  const fetchIncidents = async () => {
    try {
      const response = await apiFetch('/api/components/staff/StaffExceptions/incidents');
      if (response.ok) {
        setIncidents((await response.json()) || []);
      }
    } catch {
      // Optional endpoint fallback
    }
  };

  const filteredSessions = useMemo(() => {
    if (!searchPlate.trim()) return exceptions;
    const q = searchPlate.toLowerCase().trim();
    return exceptions.filter((ex) => {
      const plate = (ex.vehicles?.plate || '').toLowerCase();
      const brand = `${ex.vehicles?.brand || ''} ${ex.vehicles?.model || ''}`.toLowerCase();
      const owner = (ex.vehicles?.profiles?.name || '').toLowerCase();
      return plate.includes(q) || brand.includes(q) || owner.includes(q);
    });
  }, [exceptions, searchPlate]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (incidentFilter !== 'all' && inc.status !== incidentFilter) return false;
      if (searchPlate.trim()) {
        const q = searchPlate.toLowerCase().trim();
        return (
          (inc.plate || '').toLowerCase().includes(q) ||
          (inc.title || '').toLowerCase().includes(q) ||
          (inc.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidents, incidentFilter, searchPlate]);

  // ------------------------------------------------------------
  // ACTIVE SESSION ACTIONS (OPEN BARRIER / NOTIFY OWNER)
  // ------------------------------------------------------------
  const handleManualOpen = async (session) => {
    const plate = session.vehicles?.plate || 'Phương tiện';
    const reason = window.prompt(
      `Xác nhận mở Barie (AI Fallback) và hoàn tất phiên đỗ xe cho biển số ${plate}.\nNhập lý do ghi nhận vào nhật ký AI (hoặc nhấn OK):`,
      'Hỗ trợ mở barie khi biển số bị mờ / Lỗi đọc thẻ'
    );
    if (reason === null) return;

    const response = await apiFetch(`/api/components/staff/StaffExceptions/${session.id}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, reason })
    });
    if (response.ok) {
      showToast(`Đã mở Barie và hoàn tất phiên đỗ cho xe ${plate}!`);
      fetchAll();
    }
  };

  const handleNotifyOwner = async (session) => {
    const plate = session.vehicles?.plate || 'Xe';
    const customMsg = window.prompt(
      `Gửi thông báo nhắc nhở tới chủ phương tiện ${plate}:`,
      `Xe ${plate} của quý khách cần đỗ đúng vào vị trí cố định (${session.fixed_slot || '1 Slot = 1 Xe'}) để đảm bảo trật tự hầm đỗ xe.`
    );
    if (!customMsg) return;

    const response = await apiFetch(`/api/components/staff/StaffExceptions/${session.id}/notify-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.vehicles?.user_id,
        plate,
        message: customMsg
      })
    });
    if (response.ok) {
      showToast(`Đã gửi thông báo nhắc nhở tới chủ xe ${plate}!`);
    }
  };

  // ------------------------------------------------------------
  // INCIDENT CRUD HANDLERS
  // ------------------------------------------------------------
  const openCreateIncident = (prefillPlate = '') => {
    setEditingIncident(null);
    setIncidentForm({
      plate: prefillPlate || '',
      incident_type: 'WRONG_SLOT_OCCUPIED',
      severity: 'medium',
      title: prefillPlate ? `Xe ${prefillPlate} đỗ sai ô cố định (1 Slot = 1 Xe)` : '',
      description: ''
    });
    setShowIncidentModal(true);
  };

  const openEditIncident = (inc) => {
    setEditingIncident(inc);
    setIncidentForm({
      plate: inc.plate || '',
      incident_type: inc.incident_type || 'WRONG_SLOT_OCCUPIED',
      severity: inc.severity || 'medium',
      title: inc.title || '',
      description: inc.description || ''
    });
    setShowIncidentModal(true);
  };

  const handleSaveIncident = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingIncident) {
        const res = await apiFetch(`/api/components/staff/StaffExceptions/incidents/${editingIncident.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidentForm)
        });
        if (res.ok) {
          showToast('Đã cập nhật bản ghi sự cố thành công!');
          setShowIncidentModal(false);
          fetchIncidents();
        }
      } else {
        const res = await apiFetch('/api/components/staff/StaffExceptions/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidentForm)
        });
        if (res.ok) {
          showToast('🤖 AI đã phân tích sự cố và tạo đề xuất xử lý tự động!');
          setShowIncidentModal(false);
          fetchIncidents();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIncidentStatus = async (inc) => {
    const nextStatus = inc.status === 'resolved' ? 'open' : 'resolved';
    const res = await apiFetch(`/api/components/staff/StaffExceptions/incidents/${inc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) {
      showToast(
        nextStatus === 'resolved'
          ? `✓ Đã đánh dấu khắc phục sự cố (${inc.plate})`
          : `Đã mở lại sự cố (${inc.plate})`
      );
      fetchIncidents();
    }
  };

  const handleDeleteIncident = async (inc) => {
    if (!window.confirm(`Xóa bản ghi sự cố "${inc.title}"?`)) return;
    const res = await apiFetch(`/api/components/staff/StaffExceptions/incidents/${inc.id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast('Đã xóa bản ghi sự cố.');
      fetchIncidents();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">AI-DRIVEN ERROR HANDLING & INCIDENT CONTROL</p>
          <h1>Xử lý Lỗi & Sự cố Vận hành bằng AI<span>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary" onClick={fetchAll} disabled={loading}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <button className="primary" onClick={() => openCreateIncident('')}>
            ＋ Ghi nhận Sự cố / Xe đỗ sai ô
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
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>XE ĐANG CÓ MẶT TRONG BÃI</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {exceptions.length}
          </div>
          <div style={{ fontSize: '12px', color: '#059669' }}>Giám sát vị trí cố định 1 Slot = 1 Xe</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>SỰ CỐ ĐANG CẦN XỬ LÝ</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {incidents.filter((i) => i.status === 'open').length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>AI tự động phân loại & gợi ý giải pháp</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ĐÃ KHẮC PHỤC (AI FALLBACK)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {incidents.filter((i) => i.status === 'resolved').length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Tự động lưu nhật ký kiểm toán</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>HỆ THỐNG THOÁT NƯỚC & BARIE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
            💧 Khô ráo 100%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Bơm chống ngập 3 cấp • Camera AI ổn định</div>
        </div>
      </div>

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

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '16px',
          padding: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px'
        }}
      >
        <input
          type="text"
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value)}
          placeholder="🔍 Tìm nhanh theo Biển số xe, Hãng xe, Chủ xe hoặc Nội dung sự cố..."
          style={{ flex: '1 1 280px', margin: 0 }}
        />
        <select
          value={incidentFilter}
          onChange={(e) => setIncidentFilter(e.target.value)}
          style={{ margin: 0, padding: '8px 12px' }}
        >
          <option value="all">Tất cả nhật ký sự cố AI</option>
          <option value="open">🟠 Đang chờ xử lý (Open)</option>
          <option value="resolved">🟢 Đã khắc phục (Resolved)</option>
        </select>
      </div>

      {/* ============================================================ */}
      {/* PANEL 1: ACTIVE VEHICLES IN LOT & AI BARRIER FALLBACK        */}
      {/* ============================================================ */}
      <div className="records-panel" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            🚗 Danh sách Phương tiện Đang có mặt trong Bãi ({filteredSessions.length})
          </h3>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
            🤖 AI Fallback: Hỗ trợ mở Barie từ xa khi biển số mờ hoặc đỗ sai ô
          </span>
        </div>
        <p className="staff-description">
          Nhân viên có thể đối chiếu vị trí đỗ cố định (1 Slot = 1 Xe), gửi nhắc nhở tới điện thoại chủ xe hoặc kích hoạt mở Barie thủ công.
        </p>

        <table className="records-table">
          <thead>
            <tr className="records-heading">
              <th className="records-cell">STT</th>
              <th className="records-cell">Biển số & Chủ xe</th>
              <th className="records-cell">Phương tiện</th>
              <th className="records-cell">Ô đỗ cố định (1 Slot = 1 Xe)</th>
              <th className="records-cell">Giờ vào & Thời lượng</th>
              <th className="records-cell">Chẩn đoán AI</th>
              <th className="exceptions-actions-heading">Thao tác Xử lý</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan="7" className="records-empty">
                  Hiện không có phương tiện nào đang đỗ trong bãi khớp với tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredSessions.map((ex, idx) => (
                <tr key={ex.id} className="records-row">
                  <td className="records-cell" style={{ fontWeight: 600, color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td className="records-cell">
                    <span className="plate">{ex.vehicles?.plate}</span>
                    {ex.vehicles?.profiles && (
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                        👤 {ex.vehicles.profiles.name || ex.vehicles.profiles.email}
                      </div>
                    )}
                  </td>
                  <td className="records-cell">
                    <div style={{ fontWeight: 600 }}>
                      {ex.vehicles?.brand || ''} {ex.vehicles?.model || ''}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {ex.vehicles?.type === 'car' || ex.vehicles?.type === 'Ô tô' ? '🚗 Ô tô' : '🛵 Xe máy'}
                    </div>
                  </td>
                  <td className="records-cell">
                    <span
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      🔒 {ex.fixed_slot || 'Ô cố định'}
                    </span>
                  </td>
                  <td className="records-cell" style={{ fontSize: '12px' }}>
                    <div>{new Date(ex.entry_time).toLocaleString('vi-VN')}</div>
                    <div style={{ color: '#059669', fontWeight: 600 }}>
                      ⏱️ Đã đỗ: {ex.hours_parked || 0.5} giờ
                    </div>
                  </td>
                  <td className="records-cell" style={{ fontSize: '12px', maxWidth: '240px' }}>
                    {ex.ai_status === 'OVERSTAY_WARNING' ? (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ {ex.ai_recommendation}</span>
                    ) : (
                      <span style={{ color: '#059669' }}>✓ {ex.ai_recommendation}</span>
                    )}
                  </td>
                  <td className="records-cell">
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleManualOpen(ex)}
                        className="primary exceptions-open-button"
                      >
                        🔓 Mở Barie
                      </button>
                      <button
                        onClick={() => handleNotifyOwner(ex)}
                        className="secondary"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        title="Gửi thông báo nhắc nhở tới chủ xe"
                      >
                        🔔 Nhắc chủ xe
                      </button>
                      <button
                        onClick={() => openCreateIncident(ex.vehicles?.plate || '')}
                        className="secondary"
                        style={{ fontSize: '12px', padding: '6px 10px', color: '#d97706', borderColor: '#fde68a' }}
                        title="Ghi nhận sự cố / đỗ sai ô cho xe này"
                      >
                        ⚠️ Báo sự cố
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
      {/* PANEL 2: AI INCIDENT & EXCEPTION LOGS CRUD                   */}
      {/* ============================================================ */}
      <div className="records-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              🤖 Nhật ký Phân tích Sự cố & Xử lý Lỗi bằng AI ({filteredIncidents.length})
            </h3>
            <p className="staff-description" style={{ margin: '4px 0 0 0' }}>
              Thay thế hoàn toàn xử lý lỗi thủ công cứng nhắc: Mô hình AI tự động phân loại nguyên nhân, đối chiếu vị trí cố định 1 Slot = 1 Xe và đề xuất phương án khắc phục.
            </p>
          </div>
          <button className="secondary" onClick={() => openCreateIncident('')}>
            ＋ Thêm bản ghi sự cố
          </button>
        </div>

        <table className="records-table">
          <thead>
            <tr className="records-heading">
              <th className="records-cell">Biển số & Phân loại</th>
              <th className="records-cell">Mô tả sự cố</th>
              <th className="records-cell">🤖 Chẩn đoán & Đề xuất từ AI</th>
              <th className="records-cell">Thời gian</th>
              <th className="records-cell">Trạng thái</th>
              <th className="exceptions-actions-heading">Thao tác CRUD</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan="6" className="records-empty">
                  Chưa có bản ghi sự cố nào.
                </td>
              </tr>
            ) : (
              filteredIncidents.map((inc) => (
                <tr key={inc.id} className="records-row">
                  <td className="records-cell">
                    <span className="plate">{inc.plate}</span>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                      {inc.incident_type}
                    </div>
                  </td>
                  <td className="records-cell" style={{ maxWidth: '240px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{inc.title}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{inc.description}</div>
                  </td>
                  <td className="records-cell" style={{ maxWidth: '300px' }}>
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '8px',
                        fontSize: '12px',
                        color: '#065f46',
                        lineHeight: 1.45
                      }}
                    >
                      🤖 {inc.ai_diagnosis}
                    </div>
                  </td>
                  <td className="records-cell" style={{ fontSize: '11.5px' }}>
                    <div>Báo lúc: {new Date(inc.created_at).toLocaleString('vi-VN')}</div>
                    {inc.resolved_at && (
                      <div style={{ color: '#059669', fontWeight: 600 }}>
                        Xử lý: {new Date(inc.resolved_at).toLocaleTimeString('vi-VN')}
                      </div>
                    )}
                  </td>
                  <td className="records-cell">
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: inc.status === 'resolved' ? '#ecfdf5' : '#fef3c7',
                        color: inc.status === 'resolved' ? '#047857' : '#b45309'
                      }}
                    >
                      {inc.status === 'resolved' ? '✓ Đã khắc phục' : '⏳ Chờ xử lý'}
                    </span>
                  </td>
                  <td className="records-cell">
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleToggleIncidentStatus(inc)}
                        className="text-button"
                        style={{ color: '#059669', fontWeight: 700 }}
                      >
                        {inc.status === 'resolved' ? '↩ Mở lại' : '✓ Hoàn tất'}
                      </button>
                      <button
                        onClick={() => openEditIncident(inc)}
                        className="text-button"
                        style={{ color: '#2563eb', fontWeight: 600 }}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteIncident(inc)}
                        className="text-button error"
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
      {/* MODAL: CREATE / EDIT AI INCIDENT                             */}
      {/* ============================================================ */}
      {showIncidentModal && (
        <div className="dialog-overlay" onClick={() => !saving && setShowIncidentModal(false)}>
          <div
            className="dialog-content"
            style={{ maxWidth: '580px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="users-dialog-title" style={{ margin: 0 }}>
                {editingIncident ? '✏️ Cập nhật Bản ghi Sự cố' : '🤖 Ghi nhận Sự cố & Phân tích bằng AI'}
              </h3>
              <button className="slot-info-close" onClick={() => setShowIncidentModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveIncident}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Biển số xe liên quan *
                  <input
                    value={incidentForm.plate}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, plate: e.target.value }))}
                    placeholder="VD: 30G-688.86"
                    required
                  />
                </label>

                <label>
                  Mức độ ưu tiên
                  <select
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, severity: e.target.value }))}
                  >
                    <option value="low">🟢 Thấp (Low)</option>
                    <option value="medium">🟠 Trung bình (Medium)</option>
                    <option value="high">🔴 Khẩn cấp (High)</option>
                  </select>
                </label>
              </div>

              <label>
                Phân loại sự cố (AI sẽ tự động đưa ra phác đồ xử lý)
                <select
                  value={incidentForm.incident_type}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, incident_type: e.target.value }))}
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tiêu đề sự cố *
                <input
                  value={incidentForm.title}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="VD: Xe đỗ lấn sang ô A-06 / Camera cổng 2 bị mờ biển số"
                  required
                />
              </label>

              <label>
                Mô tả chi tiết hiện trường
                <input
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ghi chú vị trí hầm, tình trạng xe hoặc yêu cầu của khách..."
                />
              </label>

              <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
                <button type="button" className="secondary" onClick={() => setShowIncidentModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Đang phân tích...' : '🤖 Lưu & Phân tích bằng AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
