import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { getTicketReplyKey, loadSeenSet, saveSeenSet } from '../../lib/tabNotifications';

function formatDateTime(ts) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return (
      d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' - ' +
      d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    );
  } catch {
    return String(ts);
  }
}

export default function UserSupportCenter({ session, vehicles = [], prefill = null }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Vehicles & Profile state (fetched if not fully populated in props)
  const [localVehicles, setLocalVehicles] = useState(vehicles);
  const [customerName, setCustomerName] = useState(
    session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Khách hàng'
  );
  const [nowIso, setNowIso] = useState(new Date().toISOString());

  // 2 modes: 'GENERAL_FEEDBACK' (Ý kiến phản hồi & Góp ý) or 'SPOT_INTRUSION' (Báo sự cố vị trí đỗ)
  const [mode, setMode] = useState('GENERAL_FEEDBACK');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('');
  const [vehicleDetail, setVehicleDetail] = useState('');
  const [zoneName, setZoneName] = useState('Khu A (Hầm B1)');
  const [slotName, setSlotName] = useState('A-05');
  const [intruderPlate, setIntruderPlate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState({});
  const [sendingReplyId, setSendingReplyId] = useState(null);
  const subtabStorageKey = `ht_seen_subtab_replies_${session?.user?.id || 'guest'}`;
  const [seenSubtabReplies, setSeenSubtabReplies] = useState(() => loadSeenSet(subtabStorageKey));

  // Mark replies in the currently selected mode as seen
  useEffect(() => {
    if (tickets.length === 0) return;
    const modeTickets = tickets.filter((t) =>
      mode === 'SPOT_INTRUSION' ? t.category === 'SPOT_INTRUSION' : t.category !== 'SPOT_INTRUSION'
    );
    const keysToMark = modeTickets
      .map((t) => getTicketReplyKey(t))
      .filter((k) => k && !seenSubtabReplies.has(k));
    if (keysToMark.length > 0) {
      setSeenSubtabReplies((prev) => {
        const next = new Set(prev);
        keysToMark.forEach((k) => next.add(k));
        saveSeenSet(subtabStorageKey, next);
        return next;
      });
    }
  }, [mode, tickets]);

  // Live clock for fixed system submission timestamp preview
  useEffect(() => {
    const timer = setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/support-tickets/${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileAndVehicles = async () => {
    try {
      const profRes = await apiFetch(`/api/components/user/Dashboard/profile/${session.user.id}`);
      if (profRes.ok) {
        const prof = await profRes.json();
        if (prof?.name) setCustomerName(prof.name);
      }
    } catch {
      // Ignore profile fetch fallback
    }

    if (!vehicles || vehicles.length === 0) {
      try {
        const vehRes = await apiFetch(`/api/components/user/Dashboard/vehicles/${session.user.id}`);
        if (vehRes.ok) {
          const data = await vehRes.json();
          if (Array.isArray(data?.vehicles) && data.vehicles.length > 0) {
            setLocalVehicles(data.vehicles);
          }
        }
      } catch {
        // Ignore vehicle fetch fallback
      }
    } else {
      setLocalVehicles(vehicles);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchProfileAndVehicles();
  }, []);

  useEffect(() => {
    if (Array.isArray(vehicles) && vehicles.length > 0) {
      setLocalVehicles(vehicles);
    }
  }, [vehicles]);

  const applyFixedVehicleInfo = async (veh) => {
    if (!veh) return;
    setSelectedVehicleId(veh.id || '');
    setSelectedPlate(veh.plate || 'Chưa đăng ký');
    const brandModel = [veh.brand, veh.model].filter(Boolean).join(' ');
    const typeLabel = veh.type || 'Ô tô';
    setVehicleDetail(brandModel ? `${brandModel} (${typeLabel}) — ${veh.color || 'Tiêu chuẩn'}` : typeLabel);

    const slotObj = Array.isArray(veh.parking_slots) ? veh.parking_slots[0] : veh.parking_slots;
    if (slotObj?.slot_name) {
      setSlotName(slotObj.slot_name);
      setZoneName(slotObj.parking_zones?.zone_name || 'Khu A (Hầm B1)');
      return;
    }

    // Fallback lookup from slot picker if relational join was not present
    try {
      const res = await apiFetch(`/api/components/user/UserSlotPicker/${encodeURIComponent(veh.type || 'Ô tô')}`);
      if (res.ok) {
        const allSlots = await res.json();
        const foundSlot = (allSlots || []).find((s) => s.vehicle_id === veh.id);
        if (foundSlot) {
          setSlotName(foundSlot.slot_name || 'A-05');
          setZoneName(foundSlot.parking_zones?.zone_name || 'Khu A (Hầm B1)');
          return;
        }
      }
    } catch {
      // Ignore slot lookup fallback
    }

    setSlotName('A-05');
    setZoneName('Khu A (Hầm B1)');
  };

  useEffect(() => {
    if (localVehicles.length > 0 && !selectedPlate) {
      applyFixedVehicleInfo(localVehicles[0]);
    }
  }, [localVehicles]);

  // Apply prefill if user clicked "Phản hồi & Góp ý" from a specific VehicleCard or Notification
  useEffect(() => {
    if (!prefill) return;
    if (prefill.plate) {
      const found = localVehicles.find((v) => v.plate === prefill.plate) || prefill;
      applyFixedVehicleInfo(found);
    }
    if (prefill.category) {
      setMode(prefill.category);
    }
    if (prefill.message) {
      setMessage(prefill.message);
    }
  }, [prefill, localVehicles]);

  const handleVehicleChange = (plateVal) => {
    const found = localVehicles.find((v) => v.plate === plateVal);
    if (found) {
      applyFixedVehicleInfo(found);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/support-tickets/${session.user.id}`, {
        method: 'POST',
        body: JSON.stringify({
          category: mode,
          vehicle_id: selectedVehicleId || localVehicles[0]?.id || null,
          plate: selectedPlate || localVehicles[0]?.plate || '30G-688.86',
          vehicle_info: vehicleDetail || 'Phương tiện cố định',
          zone_name: zoneName || 'Khu A (Hầm B1)',
          slot_name: slotName || 'A-05',
          intruder_plate: mode === 'SPOT_INTRUSION' ? intruderPlate : '',
          message: message.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        const sentTime = formatDateTime(data.ticket?.created_at || new Date().toISOString());
        setSuccessMsg(
          `${data.message || 'Đã gửi ý kiến phản hồi & góp ý tới Ban quản lý!'} (Ghi nhận lúc: ${sentTime})`
        );
        setIntruderPlate('');
        setMessage('');
        fetchTickets();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFollowUp = async (ticketId, markResolved = false) => {
    const draft = (replyDrafts[ticketId] || '').trim();
    if (!draft && !markResolved) return;
    setSendingReplyId(ticketId);
    try {
      const res = await apiFetch(`/api/components/user/Dashboard/support-tickets/${session.user.id}/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          text: draft,
          markResolved
        })
      });
      if (res.ok) {
        setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
        fetchTickets();
      }
    } finally {
      setSendingReplyId(null);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HỆ THỐNG TIẾP NHẬN & HỖ TRỢ TRỰC BAN 24/7 • THÔNG TIN CỐ ĐỊNH 1 SLOT = 1 XE</p>
          <h1>Ý kiến phản hồi & Góp ý dịch vụ<span>.</span></h1>
        </div>
      </div>

      <div className="user-support-grid">
        {/* Left: Form with Strictly Fixed Read-Only Vehicle, Zone, Slot & Timestamp Info */}
        <div className="panel user-support-panel">
          <div className="user-support-tabs">
            {(() => {
              const unseenFeedbackCount = tickets.filter(
                (t) =>
                  t.category !== 'SPOT_INTRUSION' &&
                  t.user_id !== null &&
                  !t.is_demo &&
                  (t.replied_at || t.staff_reply) &&
                  !seenSubtabReplies.has(getTicketReplyKey(t))
              ).length;
              const unseenIntrusionCount = tickets.filter(
                (t) =>
                  t.category === 'SPOT_INTRUSION' &&
                  t.user_id !== null &&
                  !t.is_demo &&
                  (t.replied_at || t.staff_reply) &&
                  !seenSubtabReplies.has(getTicketReplyKey(t))
              ).length;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => setMode('GENERAL_FEEDBACK')}
                    className={`user-support-tab-btn ${mode === 'GENERAL_FEEDBACK' ? 'active-feedback' : ''}`}
                  >
                    💬 Ý kiến phản hồi & Góp ý
                    {unseenFeedbackCount > 0 && (
                      <span className="nav-tab-badge inline-subtab">{unseenFeedbackCount}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('SPOT_INTRUSION')}
                    className={`user-support-tab-btn ${mode === 'SPOT_INTRUSION' ? 'active-intrusion' : ''}`}
                  >
                    🚨 Báo sự cố tại vị trí đỗ
                    {unseenIntrusionCount > 0 && (
                      <span className="nav-tab-badge inline-subtab">{unseenIntrusionCount}</span>
                    )}
                  </button>
                </>
              );
            })()}
          </div>

          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '9px 12px',
              marginBottom: '12px',
              fontSize: '0.78rem',
              color: '#166534',
              fontWeight: 600
            }}
          >
            🔒 <strong>Thông tin cố định tự động từ hệ thống:</strong> Mọi thông tin về chủ xe, biển số phương tiện,
            khu vực bãi đỗ, ô đỗ cố định (1 Slot = 1 Xe) và thời gian phản hồi được trích xuất tự động và{' '}
            <strong>khóa cố định hoàn toàn (không thể chỉnh sửa)</strong>.
          </div>

          {successMsg && (
            <div className="users-toast">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="user-support-form">
            {/* Fixed Owner & Timestamp Row */}
            <div className="user-support-row2">
              <div>
                <label className="user-support-label">
                  🔒 Chủ phương tiện / Tài khoản (Cố định)
                </label>
                <input
                  type="text"
                  value={`${customerName} (${session?.user?.email || 'Đã xác thực'})`}
                  readOnly
                  disabled
                  tabIndex={-1}
                  className="user-support-input-ro"
                  title="Thông tin tài khoản được lấy cố định từ hệ thống, không thể chỉnh sửa"
                />
              </div>
              <div>
                <label className="user-support-label">
                  🕒 Thời gian gửi phản hồi (Cố định)
                </label>
                <input
                  type="text"
                  value={formatDateTime(nowIso)}
                  readOnly
                  disabled
                  tabIndex={-1}
                  className="user-support-input-ro"
                  title="Thời gian phản hồi được hệ thống tự động ghi nhận theo thời gian thực, không thể chỉnh sửa"
                />
              </div>
            </div>

            {/* 1. Phương tiện của bạn */}
            <div>
              <label className="user-support-label">
                1. Phương tiện đã đăng ký của bạn {localVehicles.length <= 1 ? '(🔒 Cố định)' : '(Chọn xe đã đăng ký)'}
              </label>
              {localVehicles.length > 1 ? (
                <select
                  value={selectedPlate}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="user-support-select"
                >
                  {localVehicles.map((v) => {
                    const sName = v.parking_slots?.[0]?.slot_name || slotName || 'A-05';
                    const zName = v.parking_slots?.[0]?.parking_zones?.zone_name || zoneName || 'Khu A (Hầm B1)';
                    return (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — Vị trí cố định: {zName} | Chỗ đỗ: Ô {sName}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  value={
                    selectedPlate
                      ? `${selectedPlate}${vehicleDetail ? ` — ${vehicleDetail}` : ''} (🔒 Cố định theo hồ sơ xe)`
                      : '30G-688.86 — Ô tô cố định (🔒 Cố định theo hồ sơ xe)'
                  }
                  readOnly
                  disabled
                  tabIndex={-1}
                  className="user-support-input-ro"
                  title="Thông tin phương tiện được cố định theo đăng ký, không thể chỉnh sửa"
                />
              )}
            </div>

            {/* Biển số & Dòng xe cố định (Khi có nhiều xe thì hiển thị thêm ô khóa cố định để minh bạch) */}
            {localVehicles.length > 1 && (
              <div className="user-support-row2">
                <div>
                  <label className="user-support-label">
                    🔒 Biển số xe được lấy ra (Cố định)
                  </label>
                  <input
                    type="text"
                    value={selectedPlate || '30G-688.86'}
                    readOnly
                    disabled
                    tabIndex={-1}
                    className="user-support-input-ro"
                  />
                </div>
                <div>
                  <label className="user-support-label">
                    🔒 Thông tin phương tiện (Cố định)
                  </label>
                  <input
                    type="text"
                    value={vehicleDetail || 'Ô tô đăng ký cố định'}
                    readOnly
                    disabled
                    tabIndex={-1}
                    className="user-support-input-ro"
                  />
                </div>
              </div>
            )}

            {/* 2 & 3. Khu vực bãi đỗ & Chỗ đỗ cố định — COMPLETELY READ-ONLY / DISABLED */}
            <div className="user-support-row2">
              <div>
                <label className="user-support-label">
                  2. Vị trí khu vực bãi đỗ (🔒 Cố định - Không sửa)
                </label>
                <input
                  type="text"
                  value={zoneName || 'Khu A (Hầm B1)'}
                  readOnly
                  disabled
                  tabIndex={-1}
                  className="user-support-input-ro"
                  title="Khu vực bãi đỗ được cố định theo vị trí xe đã đăng ký, người dùng không thể tự sửa"
                />
              </div>
              <div>
                <label className="user-support-label">
                  3. Chỗ đỗ cố định 1 Slot = 1 Xe (🔒 Không sửa)
                </label>
                <input
                  type="text"
                  value={slotName ? `Ô ${slotName.replace(/^Ô\s*/i, '')}` : 'Ô A-05'}
                  readOnly
                  disabled
                  tabIndex={-1}
                  className="user-support-input-slot"
                  title="Chỗ đỗ cố định gắn với phương tiện (1 Slot = 1 Xe), người dùng không thể tự sửa"
                />
              </div>
            </div>

            {mode === 'SPOT_INTRUSION' && (
              <div>
                <label className="user-support-label">
                  Biển số xe lạ đỗ vào chỗ cố định của bạn (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="VD: 99K-123.32"
                  value={intruderPlate}
                  onChange={(e) => setIntruderPlate(e.target.value)}
                  className="user-support-input"
                />
              </div>
            )}

            <div>
              <label className="user-support-label">
                4. Nội dung Ý kiến phản hồi & Góp ý (tại {zoneName || 'Khu A (Hầm B1)'} - Ô{' '}
                {(slotName || 'A-05').replace(/^Ô\s*/i, '')})
              </label>
              <textarea
                rows={3}
                placeholder="Nhập ý kiến góp ý về vị trí đỗ, thoát nước, vệ sinh hoặc dịch vụ bãi xe..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="user-support-textarea"
                required
              />
            </div>

            <button
              type="submit"
              className={`primary user-support-submit-btn ${mode === 'SPOT_INTRUSION' ? 'intrusion' : 'feedback'}`}
              disabled={submitting}
            >
              {submitting
                ? 'Đang gửi...'
                : mode === 'SPOT_INTRUSION'
                ? '🚨 Gửi báo cáo sự cố chỗ đỗ cố định'
                : '📨 Gửi Ý kiến Phản hồi & Góp ý (Kèm thời gian thực)'}
            </button>
          </form>
        </div>

        {/* Right: Clean Feedback & Reply List with Full Timestamps for User & Staff */}
        <div className="panel user-support-panel">
          <h3 className="user-support-history-title">
            Lịch sử Ý kiến Phản hồi & Thời gian Phản hồi ({tickets.length})
          </h3>

          {loading ? (
            <div className="users-detail-loading">Đang tải...</div>
          ) : tickets.length === 0 ? (
            <div className="users-detail-empty user-support-panel">
              Bạn chưa gửi ý kiến phản hồi hay góp ý nào.
            </div>
          ) : (
            <div className="user-support-form">
              {tickets.map((t) => {
                const isResolved = t.status === 'resolved';
                const thread =
                  Array.isArray(t.replies) && t.replies.length > 0
                    ? t.replies
                    : [{ sender: 'customer', author: t.customer_name || 'Bạn', text: t.message, created_at: t.created_at }];

                const staffReplies = thread.filter((m) => m.sender === 'staff');
                const latestStaffReplyTime =
                  t.replied_at ||
                  (staffReplies.length > 0 ? staffReplies[staffReplies.length - 1].created_at : null);

                return (
                  <div
                    key={t.id}
                    className="user-support-ticket-card"
                  >
                    <div className="user-support-ticket-header">
                      <strong className="user-support-ticket-subj">{t.subject}</strong>
                      <span
                        className={`user-support-ticket-status ${isResolved ? 'resolved' : 'pending'}`}
                      >
                        {isResolved ? '✓ Đã tiếp nhận & Phản hồi' : '⏳ Đang xử lý'}
                      </span>
                    </div>

                    {/* Locked Location, Slot & Vehicle Badge */}
                    <div className="user-support-loc-badge">
                      🔒 Cố định: 📍 Vị trí: {t.zone_name || 'Khu A (Hầm B1)'} — Chỗ đỗ: Ô{' '}
                      {(t.slot_name || 'A-05').replace(/^Ô\s*/i, '')} — Xe: {t.plate}
                      {t.vehicle_info ? ` (${t.vehicle_info})` : ''}
                    </div>

                    {/* Explicit Feedback & Reply Timestamps Box for Customer */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        marginBottom: '10px',
                        fontSize: '0.76rem'
                      }}
                    >
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                          🕒 Thời gian gửi ý kiến (Cố định):
                        </span>
                        <strong style={{ color: '#0f172a' }}>{formatDateTime(t.created_at)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                          🕒 Thời gian Nhân viên phản hồi:
                        </span>
                        {latestStaffReplyTime ? (
                          <strong style={{ color: '#047857' }}>{formatDateTime(latestStaffReplyTime)}</strong>
                        ) : (
                          <span style={{ color: '#b45309', fontWeight: 600 }}>⏳ Đang chờ nhân viên phản hồi</span>
                        )}
                      </div>
                    </div>

                    <div className="user-support-thread">
                      {thread.map((msg, idx) => (
                        <div
                          key={msg.id || idx}
                          className={`user-support-msg-bubble ${msg.sender === 'staff' ? 'staff' : 'customer'}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '3px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <strong className={msg.sender === 'staff' ? 'users-email-verified-badge' : 'users-sub-email'}>
                              {msg.sender === 'staff'
                                ? `🛡️ Ban quản lý / Nhân viên (${msg.author || 'Trực ban'}):`
                                : `👤 Ý kiến của bạn (${msg.author || customerName}):`}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: msg.sender === 'staff' ? '#047857' : '#64748b',
                                fontWeight: 600
                              }}
                            >
                              🕒 {formatDateTime(msg.created_at || t.created_at)}
                            </span>
                          </div>
                          <div>{msg.text}</div>
                        </div>
                      ))}
                    </div>

                    {!isResolved && (
                      <div className="user-support-reply-wrap">
                        <input
                          type="text"
                          placeholder="Gửi thông tin bổ sung thêm (không sửa nội dung gốc)..."
                          value={replyDrafts[t.id] || ''}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          className="user-support-reply-input"
                        />
                        <button
                          type="button"
                          className="secondary user-support-reply-btn"
                          disabled={sendingReplyId === t.id}
                          onClick={() => handleSendFollowUp(t.id, false)}
                        >
                          Gửi bổ sung
                        </button>
                        <button
                          type="button"
                          className="secondary user-support-done-btn"
                          disabled={sendingReplyId === t.id}
                          onClick={() => handleSendFollowUp(t.id, true)}
                        >
                          ✓ Đã xong
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
