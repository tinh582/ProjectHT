import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function UserSupportCenter({ session, vehicles = [] }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // 2 modes: 'GENERAL_FEEDBACK' (Ý kiến phản hồi & Góp ý) or 'SPOT_INTRUSION' (Báo sự cố vị trí đỗ)
  const [mode, setMode] = useState('GENERAL_FEEDBACK');
  const [selectedPlate, setSelectedPlate] = useState('');
  const [zoneName, setZoneName] = useState('Khu A (Hầm B1)');
  const [slotName, setSlotName] = useState('');
  const [intruderPlate, setIntruderPlate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState({});
  const [sendingReplyId, setSendingReplyId] = useState(null);

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

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedPlate) {
      const firstVeh = vehicles[0];
      setSelectedPlate(firstVeh.plate || '');
      setSlotName(firstVeh.parking_slots?.[0]?.slot_name || '');
      setZoneName(firstVeh.parking_slots?.[0]?.parking_zones?.zone_name || 'Khu A (Hầm B1)');
    }
  }, [vehicles]);

  const handleVehicleChange = (plateVal) => {
    setSelectedPlate(plateVal);
    const found = vehicles.find((v) => v.plate === plateVal);
    if (found) {
      setSlotName(found.parking_slots?.[0]?.slot_name || '');
      setZoneName(found.parking_slots?.[0]?.parking_zones?.zone_name || 'Khu A (Hầm B1)');
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
          plate: selectedPlate || vehicles[0]?.plate || 'Chưa rõ',
          zone_name: zoneName || 'Khu A (Hầm B1)',
          slot_name: slotName || 'Chưa chọn',
          intruder_plate: mode === 'SPOT_INTRUSION' ? intruderPlate : '',
          message: message.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Đã gửi ý kiến phản hồi & góp ý tới Ban quản lý!');
        setIntruderPlate('');
        setMessage('');
        fetchTickets();
        setTimeout(() => setSuccessMsg(''), 4000);
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
          <p className="eyebrow">HỆ THỐNG TIẾP NHẬN & HỖ TRỢ TRỰC BAN 24/7</p>
          <h1>Ý kiến phản hồi & Góp ý dịch vụ<span>.</span></h1>
        </div>
      </div>

      <div className="user-support-grid">
        {/* Left: Form */}
        <div className="panel user-support-panel">
          <div className="user-support-tabs">
            <button
              type="button"
              onClick={() => setMode('GENERAL_FEEDBACK')}
              className={`user-support-tab-btn ${mode === 'GENERAL_FEEDBACK' ? 'active-feedback' : ''}`}
            >
              💬 Ý kiến phản hồi & Góp ý
            </button>
            <button
              type="button"
              onClick={() => setMode('SPOT_INTRUSION')}
              className={`user-support-tab-btn ${mode === 'SPOT_INTRUSION' ? 'active-intrusion' : ''}`}
            >
              🚨 Báo sự cố tại vị trí đỗ
            </button>
          </div>

          {successMsg && (
            <div className="users-toast">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="user-support-form">
            <div>
              <label className="user-support-label">
                1. Phương tiện của bạn
              </label>
              {vehicles.length > 0 ? (
                <select
                  value={selectedPlate}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="user-support-select"
                >
                  {vehicles.map((v) => {
                    const sName = v.parking_slots?.[0]?.slot_name;
                    const zName = v.parking_slots?.[0]?.parking_zones?.zone_name || 'Khu A';
                    return (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — {sName ? `Vị trí: ${zName} | Chỗ đỗ: Ô ${sName}` : 'Chưa chọn chỗ đỗ'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Biển số xe của bạn"
                  value={selectedPlate}
                  onChange={(e) => setSelectedPlate(e.target.value)}
                  className="user-support-input"
                />
              )}
            </div>

            {/* Khu vực / Vị trí & Chỗ đỗ nào */}
            <div className="user-support-row2">
              <div>
                <label className="user-support-label">
                  2. Vị trí khu vực bãi đỗ
                </label>
                <input
                  type="text"
                  placeholder="VD: Khu A (Hầm B1)"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="user-support-input-ro"
                />
              </div>
              <div>
                <label className="user-support-label">
                  3. Chỗ đỗ cố định (Ô số mấy)
                </label>
                <input
                  type="text"
                  placeholder="VD: A1-6"
                  value={slotName}
                  onChange={(e) => setSlotName(e.target.value)}
                  className="user-support-input-slot"
                />
              </div>
            </div>

            {mode === 'SPOT_INTRUSION' && (
              <div>
                <label className="user-support-label">
                  Biển số xe lạ đỗ vào chỗ của bạn (Không bắt buộc)
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
                4. Nội dung Ý kiến phản hồi & Góp ý (tại {zoneName || 'Khu vực'} - Ô {slotName || 'Cố định'})
              </label>
              <textarea
                rows={3}
                placeholder="Nhập ý kiến góp ý về vị trí đỗ, thoát nước, vệ sinh hoặc dịch vụ bãi xe..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="user-support-textarea"
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
                ? '🚨 Gửi báo cáo sự cố chỗ đỗ'
                : '📨 Gửi Ý kiến Phản hồi & Góp ý'}
            </button>
          </form>
        </div>

        {/* Right: Clean Feedback & Reply List */}
        <div className="panel user-support-panel">
          <h3 className="user-support-history-title">
            Lịch sử Ý kiến Phản hồi & Góp ý của bạn ({tickets.length})
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
                    : [{ sender: 'customer', text: t.message }];

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

                    {/* Location & Slot Badge */}
                    <div className="user-support-loc-badge">
                      📍 Vị trí: {t.zone_name || 'Khu A (Hầm B1)'} — Chỗ đỗ: Ô {t.slot_name || 'Cố định'} (Xe {t.plate})
                    </div>

                    <div className="user-support-thread">
                      {thread.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`user-support-msg-bubble ${msg.sender === 'staff' ? 'staff' : 'customer'}`}
                        >
                          <strong className={msg.sender === 'staff' ? 'users-email-verified-badge' : 'users-sub-email'}>
                            {msg.sender === 'staff' ? 'Ban quản lý phản hồi: ' : 'Ý kiến của bạn: '}
                          </strong>
                          {msg.text}
                        </div>
                      ))}
                    </div>

                    {!isResolved && (
                      <div className="user-support-reply-wrap">
                        <input
                          type="text"
                          placeholder="Góp ý bổ sung..."
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
                          Gửi
                        </button>
                        <button
                          type="button"
                          className="secondary user-support-done-btn"
                          disabled={sendingReplyId === t.id}
                          onClick={() => handleSendFollowUp(t.id, true)}
                        >
                          ✓ Xong
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
