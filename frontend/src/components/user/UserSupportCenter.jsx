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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left: Form */}
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
                border: mode === 'GENERAL_FEEDBACK' ? '2px solid #059669' : '1px solid #e2e8f0',
                background: mode === 'GENERAL_FEEDBACK' ? '#ecfdf5' : '#f8fafc',
                color: mode === 'GENERAL_FEEDBACK' ? '#047857' : '#475569'
              }}
            >
              💬 Ý kiến phản hồi & Góp ý
            </button>
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
              🚨 Báo sự cố tại vị trí đỗ
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
                1. Phương tiện của bạn
              </label>
              {vehicles.length > 0 ? (
                <select
                  value={selectedPlate}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
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
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              )}
            </div>

            {/* Khu vực / Vị trí & Chỗ đỗ nào */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  2. Vị trí khu vực bãi đỗ
                </label>
                <input
                  type="text"
                  placeholder="VD: Khu A (Hầm B1)"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  3. Chỗ đỗ cố định (Ô số mấy)
                </label>
                <input
                  type="text"
                  placeholder="VD: A1-6"
                  value={slotName}
                  onChange={(e) => setSlotName(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, color: '#047857' }}
                />
              </div>
            </div>

            {mode === 'SPOT_INTRUSION' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Biển số xe lạ đỗ vào chỗ của bạn (Không bắt buộc)
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
                4. Nội dung Ý kiến phản hồi & Góp ý (tại {zoneName || 'Khu vực'} - Ô {slotName || 'Cố định'})
              </label>
              <textarea
                rows={3}
                placeholder="Nhập ý kiến góp ý về vị trí đỗ, thoát nước, vệ sinh hoặc dịch vụ bãi xe..."
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
                background: mode === 'SPOT_INTRUSION' ? '#dc2626' : '#059669',
                fontWeight: 700
              }}
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
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1rem' }}>
            Lịch sử Ý kiến Phản hồi & Góp ý của bạn ({tickets.length})
          </h3>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              Bạn chưa gửi ý kiến phản hồi hay góp ý nào.
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t.subject}</strong>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isResolved ? '#dcfce7' : '#fef3c7',
                          color: isResolved ? '#15803d' : '#b45309',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isResolved ? '✓ Đã tiếp nhận & Phản hồi' : '⏳ Đang xử lý'}
                      </span>
                    </div>

                    {/* Location & Slot Badge */}
                    <div
                      style={{
                        display: 'inline-block',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        marginBottom: '8px'
                      }}
                    >
                      📍 Vị trí: {t.zone_name || 'Khu A (Hầm B1)'} — Chỗ đỗ: Ô {t.slot_name || 'Cố định'} (Xe {t.plate})
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
                            {msg.sender === 'staff' ? 'Ban quản lý phản hồi: ' : 'Ý kiến của bạn: '}
                          </strong>
                          {msg.text}
                        </div>
                      ))}
                    </div>

                    {!isResolved && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Góp ý bổ sung..."
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
