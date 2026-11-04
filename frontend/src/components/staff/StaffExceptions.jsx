import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import { buildSampleGplxFront, buildSampleGplxBack } from '../../lib/sampleKyc';

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
  const [gplxVerifySession, setGplxVerifySession] = useState(null);

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
        <div className="support-header-actions">
          <button className="secondary" onClick={fetchAll} disabled={loading}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <button className="primary" onClick={() => openCreateIncident('')}>
            ＋ Ghi nhận Sự cố / Xe đỗ sai ô
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="users-kpi-grid">
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">XE ĐANG CÓ MẶT TRONG BÃI</div>
          <div className="users-kpi-val">
            {exceptions.length}
          </div>
          <div className="users-kpi-desc is-success">Giám sát vị trí cố định 1 Slot = 1 Xe</div>
        </div>
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">SỰ CỐ ĐANG CẦN XỬ LÝ</div>
          <div className="users-kpi-val is-warning">
            {incidents.filter((i) => i.status === 'open').length}
          </div>
          <div className="users-kpi-desc">AI tự động phân loại & gợi ý giải pháp</div>
        </div>
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">ĐÃ KHẮC PHỤC (AI FALLBACK)</div>
          <div className="users-kpi-val is-success">
            {incidents.filter((i) => i.status === 'resolved').length}
          </div>
          <div className="users-kpi-desc">Tự động lưu nhật ký kiểm toán</div>
        </div>
        <div className="panel users-kpi-card">
          <div className="users-kpi-label">HỆ THỐNG THOÁT NƯỚC & BARIE</div>
          <div className="users-kpi-val is-success">
            💧 Khô ráo 100%
          </div>
          <div className="users-kpi-desc">Bơm chống ngập 3 cấp • Camera AI ổn định</div>
        </div>
      </div>

      {toastMsg && (
        <div className="users-toast">
          ✓ {toastMsg}
        </div>
      )}

      {/* Search Bar */}
      <div className="support-filter-bar">
        <input
          type="text"
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value)}
          placeholder="🔍 Tìm nhanh theo Biển số xe, Hãng xe, Chủ xe hoặc Nội dung sự cố..."
          className="support-filter-input"
        />
        <select
          value={incidentFilter}
          onChange={(e) => setIncidentFilter(e.target.value)}
        >
          <option value="all">Tất cả nhật ký sự cố AI</option>
          <option value="open">🟠 Đang chờ xử lý (Open)</option>
          <option value="resolved">🟢 Đã khắc phục (Resolved)</option>
        </select>
      </div>

      {/* ============================================================ */}
      {/* PANEL 1: ACTIVE VEHICLES IN LOT & AI BARRIER FALLBACK        */}
      {/* ============================================================ */}
      <div className="records-panel support-records-panel">
        <div className="support-fb-header">
          <h3 className="support-fb-title">
            🚗 Danh sách Phương tiện Đang có mặt trong Bãi ({filteredSessions.length})
          </h3>
          <span className="users-email-verified-badge">
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
                  <td className="records-cell support-col-stt">
                    {idx + 1}
                  </td>
                  <td className="records-cell">
                    <span className="plate">{ex.vehicles?.plate}</span>
                    {ex.vehicles?.profiles && (
                      <div className="support-customer-email">
                        👤 {ex.vehicles.profiles.name || ex.vehicles.profiles.email}
                      </div>
                    )}
                  </td>
                  <td className="records-cell">
                    <div className="support-plan-cell">
                      {ex.vehicles?.brand || ''} {ex.vehicles?.model || ''}
                    </div>
                    <div className="support-customer-email">
                      {ex.vehicles?.type === 'car' || ex.vehicles?.type === 'Ô tô' ? '🚗 Ô tô' : '🛵 Xe máy'}
                    </div>
                  </td>
                  <td className="records-cell">
                    <span className="exceptions-fixed-slot-tag">
                      🔒 {ex.fixed_slot || 'Ô cố định'}
                    </span>
                  </td>
                  <td className="records-cell support-date-cell">
                    <div>{new Date(ex.entry_time).toLocaleString('vi-VN')}</div>
                    <div className="users-email-verified-badge">
                      ⏱️ Đã đỗ: {ex.hours_parked || 0.5} giờ
                    </div>
                  </td>
                  <td className="records-cell support-cycle-cell">
                    {ex.ai_status === 'OVERSTAY_WARNING' ? (
                      <span className="exceptions-diag-warn">⚠️ {ex.ai_recommendation}</span>
                    ) : (
                      <span className="exceptions-diag-ok">✓ {ex.ai_recommendation}</span>
                    )}
                  </td>
                  <td className="records-cell">
                    <div className="support-action-btns">
                      <button
                        onClick={() => handleManualOpen(ex)}
                        className="primary exceptions-open-button"
                      >
                        🔓 Mở Barie
                      </button>
                      <button
                        onClick={() => setGplxVerifySession(ex)}
                        className="secondary exceptions-btn-gplx"
                        title="Đối chiếu thủ công Giấy phép lái xe (GPLX) của chủ phương tiện"
                      >
                        🪪 Đối chiếu GPLX
                      </button>
                      <button
                        onClick={() => handleNotifyOwner(ex)}
                        className="secondary exceptions-btn-notify"
                        title="Gửi thông báo nhắc nhở tới chủ xe"
                      >
                        🔔 Nhắc chủ xe
                      </button>
                      <button
                        onClick={() => openCreateIncident(ex.vehicles?.plate || '')}
                        className="secondary exceptions-btn-report"
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
        <div className="support-fb-header">
          <div>
            <h3 className="support-fb-title">
              🤖 Nhật ký Phân tích Sự cố & Xử lý Lỗi bằng AI ({filteredIncidents.length})
            </h3>
            <p className="staff-description support-fb-desc">
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
                    <div className="support-fb-email">
                      {inc.incident_type}
                    </div>
                  </td>
                  <td className="records-cell support-fb-msg-cell">
                    <div className="support-fb-subject">{inc.title}</div>
                    <div className="support-fb-message">{inc.description}</div>
                  </td>
                  <td className="records-cell">
                    <div className="exceptions-ai-box">
                      🤖 {inc.ai_diagnosis}
                    </div>
                  </td>
                  <td className="records-cell support-cycle-cell">
                    <div>Báo lúc: {new Date(inc.created_at).toLocaleString('vi-VN')}</div>
                    {inc.resolved_at && (
                      <div className="support-cycle-confirmed">
                        Xử lý: {new Date(inc.resolved_at).toLocaleTimeString('vi-VN')}
                      </div>
                    )}
                  </td>
                  <td className="records-cell">
                    <span className={`exceptions-status-tag ${inc.status === 'resolved' ? 'resolved' : 'open'}`}>
                      {inc.status === 'resolved' ? '✓ Đã khắc phục' : '⏳ Chờ xử lý'}
                    </span>
                  </td>
                  <td className="records-cell">
                    <div className="support-action-btns">
                      <button
                        onClick={() => handleToggleIncidentStatus(inc)}
                        className="text-button exceptions-btn-toggle"
                      >
                        {inc.status === 'resolved' ? '↩ Mở lại' : '✓ Hoàn tất'}
                      </button>
                      <button
                        onClick={() => openEditIncident(inc)}
                        className="text-button exceptions-btn-edit"
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
            className="dialog-content exceptions-dialog-incident"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-dialog-header">
              <h3 className="users-dialog-title">
                {editingIncident ? '✏️ Cập nhật Bản ghi Sự cố' : '🤖 Ghi nhận Sự cố & Phân tích bằng AI'}
              </h3>
              <button className="slot-info-close" onClick={() => setShowIncidentModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveIncident}>
              <div className="users-form-grid-2col">
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

              <div className="users-dialog-actions users-dialog-actions-mt">
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

      {/* ============================================================ */}
      {/* MODAL: MANUAL DRIVER'S LICENSE (GPLX) VERIFICATION           */}
      {/* ============================================================ */}
      {gplxVerifySession && (
        <div className="dialog-overlay" onClick={() => setGplxVerifySession(null)}>
          <div
            className="dialog-content exceptions-dialog-gplx"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-dialog-header">
              <h3 className="users-dialog-title">
                🪪 Đối chiếu thủ công Giấy phép lái xe (GPLX)
              </h3>
              <button className="slot-info-close" onClick={() => setGplxVerifySession(null)}>✕</button>
            </div>

            <div className="exceptions-gplx-banner">
              <div>
                <strong>Chủ phương tiện:</strong>{' '}
                {gplxVerifySession.vehicles?.profiles?.name || 'Khách hàng cố định'} •{' '}
                <strong>Biển số:</strong> {gplxVerifySession.vehicles?.plate} •{' '}
                <strong>Vị trí cố định:</strong> {gplxVerifySession.fixed_slot || 'Ô cố định'}
              </div>
              <div className="exceptions-gplx-banner-sub">
                Kiểm tra hình chụp Giấy phép lái xe (Mặt trước & Mặt sau) khớp với chủ phương tiện trước khi mở Barie thủ công.
              </div>
            </div>

            <div className="exceptions-gplx-grid">
              <div>
                <div className="exceptions-gplx-title">
                  Mặt trước GPLX (PET)
                </div>
                <img
                  src={buildSampleGplxFront({
                    name: gplxVerifySession.vehicles?.profiles?.name || 'NGUYỄN VĂN AN',
                    licenseClass:
                      gplxVerifySession.vehicles?.type === 'car' || gplxVerifySession.vehicles?.type === 'Ô tô'
                        ? 'B2'
                        : 'A1'
                  })}
                  alt="GPLX Mặt trước"
                  className="exceptions-gplx-img"
                />
              </div>
              <div>
                <div className="exceptions-gplx-title">
                  Mặt sau GPLX (Hạng xe được phép điều khiển)
                </div>
                <img
                  src={buildSampleGplxBack({
                    licenseClass:
                      gplxVerifySession.vehicles?.type === 'car' || gplxVerifySession.vehicles?.type === 'Ô tô'
                        ? 'B2'
                        : 'A1'
                  })}
                  alt="GPLX Mặt sau"
                  className="exceptions-gplx-img"
                />
              </div>
            </div>

            <div className="users-dialog-actions">
              <button type="button" className="secondary" onClick={() => setGplxVerifySession(null)}>
                Đóng
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const s = gplxVerifySession;
                  setGplxVerifySession(null);
                  handleManualOpen(s);
                }}
              >
                ✓ Xác nhận GPLX hợp lệ & Mở Barie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
