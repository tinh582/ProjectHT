import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function UserSupportCenter({ session, vehicles = [], prefillContext = null, onClearPrefill }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Simple 2-mode toggle: 'SPOT_INTRUSION' or 'GENERAL_FEEDBACK'
  const [mode, setMode] = useState('SPOT_INTRUSION');
  const [selectedPlate, setSelectedPlate] = useState('');
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
    if (prefillContext) {
      setMode(prefillContext.category === 'GENERAL_FEEDBACK' ? 'GENERAL_FEEDBACK' : 'SPOT_INTRUSION');
      if (prefillContext.plate) setSelectedPlate(prefillContext.plate);
      if (prefillContext.slot_name) setSlotName(prefillContext.slot_name);
      if (prefillContext.message) setMessage(prefillContext.message);
    } else if (vehicles.length > 0 && !selectedPlate) {
      const firstVeh = vehicles[0];
      setSelectedPlate(firstVeh.plate || '');
      setSlotName(firstVeh.parking_slots?.[0]?.slot_name || '');
    }
  }, [prefillContext, vehicles]);

  const handleVehicleChange = (plateVal) => {
    setSelectedPlate(plateVal);
    const found = vehicles.find((v) => v.plate === plateVal);
    if (found) {
      setSlotName(found.parking_slots?.[0]?.slot_name || '');
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
          slot_name: slotName,
          intruder_plate: mode === 'SPOT_INTRUSION' ? intruderPlate : '',
          message: message.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Đã gửi tới nhân viên trực ban!');
        setIntruderPlate('');
        setMessage('');
        onClearPrefill?.();
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
          <p className="eyebrow">HỖ TRỢ KHÁCH HÀNG</p>
          <h1>Báo chiếm chỗ & Hỏi đáp<span>.</span></h1>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left: Simple Compact Form */}
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setMode('SPOT_INTRUSION')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                border: mode === 'SPOT_INTRUSION' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                background: mode === 'SPOT_INTRUSION' ? '#fef2f2' : '#f8fafc',
                color: mode === 'SPOT_INTRUSION' ? '#dc2626' : '#475569'
              }}
            >
              🚨 Báo chiếm chỗ đỗ
            </button>
            <button
              type="button"
              onClick={() => setMode('GENERAL_FEEDBACK')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                border: mode === 'GENERAL_FEEDBACK' ? '2px solid #0f766e' : '1px solid #e2e8f0',
                background: mode === 'GENERAL_FEEDBACK' ? '#f0fdf4' : '#f8fafc',
                color: mode === 'GENERAL_FEEDBACK' ? '#0f766e' : '#475569'
              }}
            >
              💬 Gửi câu hỏi / Phản hồi
            </button>
          </div>

          {successMsg && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: '12px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#047857',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid #a7f3d0'
              }}
            >
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Phương tiện & Ô đỗ của bạn
              </label>
              {vehicles.length > 0 ? (
                <select
                  value={selectedPlate}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  {vehicles.map((v) => {
                    const sName = v.parking_slots?.[0]?.slot_name;
                    return (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — {sName ? `Ô đỗ: ${sName}` : 'Chưa chọn ô'}
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
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              )}
            </div>

            {mode === 'SPOT_INTRUSION' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Biển số xe đang đỗ nhầm ô của bạn (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="VD: 99K-123.32"
                  value={intruderPlate}
                  onChange={(e) => setIntruderPlate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                {mode === 'SPOT_INTRUSION' ? 'Ghi chú thêm (Không bắt buộc)' : 'Nội dung câu hỏi *'}
              </label>
              <textarea
                rows={3}
                required={mode !== 'SPOT_INTRUSION'}
                placeholder={
                  mode === 'SPOT_INTRUSION'
                    ? 'Có thể để trống — Hệ thống sẽ tự gửi mã ô đỗ cho nhân viên kiểm tra ngay.'
                    : 'Nhập câu hỏi hoặc phản hồi của bạn...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <button
              type="submit"
              className="primary"
              disabled={submitting}
              style={{
                padding: '11px 16px',
                background: mode === 'SPOT_INTRUSION' ? '#dc2626' : '#0f766e',
                fontWeight: 700
              }}
            >
              {submitting
                ? 'Đang gửi...'
                : mode === 'SPOT_INTRUSION'
                ? '🚨 Gửi báo cáo chiếm chỗ'
                : '📨 Gửi câu hỏi'}
            </button>
          </form>
        </div>

        {/* Right: Clean Conversation List */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1rem' }}>
            Yêu cầu của bạn ({tickets.length})
          </h3>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              Bạn chưa gửi yêu cầu nào.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {tickets.map((t) => {
                const isResolved = t.status === 'resolved';
                const thread =
                  Array.isArray(t.replies) && t.replies.length > 0
                    ? t.replies
                    : [{ sender: 'customer', text: t.message }];

                return (
                  <div
                    key={t.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t.subject}</strong>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isResolved ? '#dcfce7' : '#fef3c7',
                          color: isResolved ? '#15803d' : '#b45309'
                        }}
                      >
                        {isResolved ? '✓ Đã xử lý' : '⏳ Đang xử lý'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
                      {thread.map((msg, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: msg.sender === 'staff' ? '#ecfdf5' : '#f8fafc',
                            fontSize: '0.83rem',
                            color: '#1e293b'
                          }}
                        >
                          <strong style={{ color: msg.sender === 'staff' ? '#047857' : '#475569' }}>
                            {msg.sender === 'staff' ? 'Nhân viên: ' : 'Bạn: '}
                          </strong>
                          {msg.text}
                        </div>
                      ))}
                    </div>

                    {!isResolved && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Nhắn thêm..."
                          value={replyDrafts[t.id] || ''}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8rem'
                          }}
                        />
                        <button
                          type="button"
                          className="secondary"
                          disabled={sendingReplyId === t.id}
                          onClick={() => handleSendFollowUp(t.id, false)}
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        >
                          Gửi
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={sendingReplyId === t.id}
                          onClick={() => handleSendFollowUp(t.id, true)}
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#15803d' }}
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
