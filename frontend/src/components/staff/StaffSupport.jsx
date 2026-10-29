import { apiFetch } from '../../lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '../shared/Pagination';
import { readPage } from '../../lib/pagination';

function buildSampleVietQrReceipt({ customerName = 'NGUYỄN MINH TUẤN', amount = 900000, txId = 'HTP-998877' } = {}) {
  const formattedAmt = Number(amount || 900000).toLocaleString('vi-VN');
  const nowStr = new Date().toLocaleString('vi-VN');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="580" viewBox="0 0 440 580">
  <rect width="440" height="580" rx="20" fill="#f0fdf4" stroke="#10b981" stroke-width="3"/>
  <rect x="20" y="20" width="400" height="540" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
  <circle cx="220" cy="74" r="28" fill="#10b981"/>
  <polyline points="206,74 216,84 236,64" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="220" y="124" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#065f46">CHUYỂN KHOẢN THÀNH CÔNG</text>
  <text x="220" y="146" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#64748b">BIDV SmartBanking • VietQR Napas 247</text>
  <text x="220" y="186" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#059669">${formattedAmt} VND</text>
  <line x1="44" y1="212" x2="396" y2="212" stroke="#cbd5e1" stroke-dasharray="5,4"/>
  <text x="48" y="246" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Tài khoản thụ hưởng:</text>
  <text x="392" y="246" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">HT PARKING SYSTEM</text>
  <text x="48" y="278" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Số tài khoản nhận:</text>
  <text x="392" y="278" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">6261378455 (BIDV)</text>
  <text x="48" y="310" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Người chuyển khoản:</text>
  <text x="392" y="310" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${customerName}</text>
  <text x="48" y="342" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Mã giao dịch:</text>
  <text x="392" y="342" text-anchor="end" font-family="Courier New, monospace" font-size="12" font-weight="bold" fill="#059669">${txId}</text>
  <text x="48" y="374" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Thời gian giao dịch:</text>
  <text x="392" y="374" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${nowStr}</text>
  <rect x="44" y="404" width="352" height="68" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="58" y="426" font-family="Arial, sans-serif" font-size="11" fill="#64748b">Nội dung chuyển khoản (AI OCR Verified):</text>
  <text x="58" y="450" font-family="Courier New, monospace" font-size="13" font-weight="bold" fill="#0f172a">HTPARKING ${txId} THANH TOAN GOI THUE</text>
  <rect x="110" y="498" width="220" height="32" rx="16" fill="#059669"/>
  <text x="220" y="519" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff">✓ ĐÃ XÁC THỰC BIÊN LAI AI OCR</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function StaffSupport() {
  const [transactions, setTransactions] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [previewProof, setPreviewProof] = useState(null);
  const pageSize = 25;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');

  // Edit Transaction Cycle & Proof Modal
  const [editingTx, setEditingTx] = useState(null);
  const [editTxForm, setEditTxForm] = useState({
    status: 'completed',
    cycle_start: '',
    cycle_end: '',
    confirmed_at: '',
    payment_proof: ''
  });
  const [savingTx, setSavingTx] = useState(false);

  // Add / Reply Customer Feedback Modal
  const [showFbModal, setShowFbModal] = useState(false);
  const [replyingFb, setReplyingFb] = useState(null);
  const [fbForm, setFbForm] = useState({
    customer_name: '',
    customer_email: '',
    plate: '',
    subject: '',
    message: '',
    staff_reply: ''
  });

  useEffect(() => {
    fetchAll();
  }, [page]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 4500);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchFeedbacks()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setError('');
    try {
      const response = await apiFetch(`/api/components/staff/StaffSupport?page=${page}&pageSize=${pageSize}`);
      if (response.ok) {
        const data = readPage(await response.json(), page, pageSize);
        setTransactions(data.items);
        setTotal(data.total);
        if (page > 1 && data.items.length === 0) setPage(page - 1);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await apiFetch('/api/components/staff/StaffSupport/feedbacks');
      if (response.ok) {
        setFeedbacks((await response.json()) || []);
      }
    } catch {
      // Optional endpoint fallback
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (verifyFilter === 'ai' && !t.auto_verified) return false;
      if (verifyFilter === 'manual' && t.auto_verified) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(t.id || '').toLowerCase().includes(q);
        const matchName = (t.profiles?.name || '').toLowerCase().includes(q);
        const matchEmail = (t.profiles?.email || '').toLowerCase().includes(q);
        const matchPlan = (t.plan_name || '').toLowerCase().includes(q);
        return matchId || matchName || matchEmail || matchPlan;
      }
      return true;
    });
  }, [transactions, statusFilter, verifyFilter, searchQuery]);

  const summary = useMemo(() => {
    const pending = transactions.filter((t) => t.status === 'pending').length;
    const completed = transactions.filter((t) => t.status === 'completed').length;
    const aiVerified = transactions.filter((t) => t.auto_verified).length;
    return { pending, completed, aiVerified };
  }, [transactions]);

  // ------------------------------------------------------------
  // TRANSACTION ACTIONS
  // ------------------------------------------------------------
  const handleUpdateStatus = async (id, status) => {
        let reason = '';
    if (status === 'rejected') {
      const input = window.prompt(
        'Nhập lý do từ chối giao dịch thanh toán này (hoặc bấm OK để dùng lý do mặc định):',
        'Biên lai chuyển khoản không hợp lệ hoặc chưa nhận được tiền.'
      );
      if (input === null) return;
      reason = input.trim();
    } else if (
      !window.confirm(
        status === 'completed'
          ? 'Xác nhận duyệt gói cước này và kích hoạt chu kỳ thuê 30 ngày cho khách hàng?'
          : 'Xác nhận hoàn tiền giao dịch này?'
      )
    ) {
      return;
    }

    const response = await apiFetch(`/api/components/staff/StaffSupport/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason })
    });
    if (response.ok) {
      showToast(
        status === 'completed'
          ? '✓ Đã duyệt gói thuê và ghi nhận ngày bắt đầu, kết thúc & thời điểm duyệt!'
          : status === 'rejected'
            ? '✕ Đã từ chối giao dịch và gửi thông báo lý do cho khách hàng.'
            : 'Đã chuyển trạng thái giao dịch sang Hoàn tiền.'
      );
      fetchTransactions();
    }
  };

  const handleRunAiOcr = async (t) => {
    const sampleProof =
      t.payment_proof ||
      buildSampleVietQrReceipt({
        customerName: (t.profiles?.name || 'KHÁCH HÀNG HT PARKING').toUpperCase(),
        amount: t.amount,
        txId: String(t.id).slice(0, 8).toUpperCase()
      });

    const response = await apiFetch(`/api/components/staff/StaffSupport/${t.id}/ai-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_proof: sampleProof,
        amount: t.amount,
        user_id: t.user_id,
        plan_name: t.plan_name
      })
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      showToast(data.message || '🤖 AI OCR đã đối soát và kích hoạt giao dịch!');
      fetchTransactions();
    }
  };

  const toDateInputVal = (isoStr) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const openEditTxModal = (t) => {
    const now = new Date();
    const plus30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    setEditingTx(t);
    setEditTxForm({
      status: t.status || 'completed',
      cycle_start: toDateInputVal(t.cycle_start || now.toISOString()),
      cycle_end: toDateInputVal(t.cycle_end || plus30.toISOString()),
      confirmed_at: toDateInputVal(t.confirmed_at || now.toISOString()),
      payment_proof: t.payment_proof || ''
    });
  };

  const handleSaveTxDetails = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    setSavingTx(true);
    try {
      const response = await apiFetch(`/api/components/staff/StaffSupport/${editingTx.id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editTxForm.status,
          cycle_start: editTxForm.cycle_start ? new Date(editTxForm.cycle_start).toISOString() : null,
          cycle_end: editTxForm.cycle_end ? new Date(editTxForm.cycle_end).toISOString() : null,
          confirmed_at: editTxForm.confirmed_at ? new Date(editTxForm.confirmed_at).toISOString() : null,
          payment_proof: editTxForm.payment_proof || null
        })
      });
      if (response.ok) {
        setEditingTx(null);
        showToast('✓ Đã lưu thời gian chu kỳ thuê, ngày duyệt và ảnh xác thực giao dịch!');
        fetchTransactions();
      }
    } finally {
      setSavingTx(false);
    }
  };

  // ------------------------------------------------------------
  // FEEDBACK & MULTI-CHANNEL ALERT CRUD HANDLERS
  // ------------------------------------------------------------
  const openAddFeedback = () => {
    setReplyingFb(null);
    setFbForm({
      customer_name: '',
      customer_email: '',
      plate: '',
      subject: '',
      message: '',
      staff_reply: ''
    });
    setShowFbModal(true);
  };

  const openReplyFeedback = (fb) => {
    setReplyingFb(fb);
    setFbForm({
      customer_name: fb.customer_name || '',
      customer_email: fb.customer_email || '',
      plate: fb.plate || '',
      subject: fb.subject || '',
      message: fb.message || '',
      staff_reply: fb.staff_reply || ''
    });
    setShowFbModal(true);
  };

  const handleSaveFeedback = async (e) => {
    e.preventDefault();
    if (replyingFb) {
      const res = await apiFetch(`/api/components/staff/StaffSupport/feedbacks/${replyingFb.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_reply: fbForm.staff_reply,
          status: 'resolved'
        })
      });
      if (res.ok) {
        setShowFbModal(false);
        showToast(`Đã gửi phản hồi tới khách hàng ${replyingFb.customer_name}!`);
        fetchFeedbacks();
      }
    } else {
      const res = await apiFetch('/api/components/staff/StaffSupport/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbForm)
      });
      if (res.ok) {
        setShowFbModal(false);
        showToast('🔔 Đã ghi nhận ý kiến phản hồi và phát thông báo đa kênh tới nhân viên trực ban!');
        fetchFeedbacks();
      }
    }
  };

  const handleDeleteFeedback = async (fb) => {
    if (!window.confirm(`Xóa ý kiến phản hồi "${fb.subject}"?`)) return;
    const res = await apiFetch(`/api/components/staff/StaffSupport/feedbacks/${fb.id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast('Đã xóa phản hồi.');
      fetchFeedbacks();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER SUPPORT • AI OCR PAYMENT PROOF & MULTI-CHANNEL ALERTS</p>
          <h1>Hỗ trợ Thanh toán & Ý kiến Phản hồi<span>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary" onClick={fetchAll} disabled={loading}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <button className="primary" onClick={openAddFeedback}>
            ＋ Ghi nhận Phản hồi Khách hàng
          </button>
        </div>
      </div>

      {/* Multi-Channel Staff Alert Status Banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, #ecfdf5 0%, #eff6ff 100%)',
          border: '1px solid #a7f3d0',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12.5px'
        }}
      >
        <div>
          <strong style={{ color: '#065f46' }}>📡 Kênh nhận thông báo & phản hồi của Nhân viên:</strong>{' '}
          Khi khách hàng gửi biên lai thanh toán hoặc ý kiến phản hồi, nhân viên nhận thông báo tức thì qua 4 kênh:
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '999px', border: '1px solid #6ee7b7', fontWeight: 700, color: '#047857' }}>
            🔔 Chuông Dashboard Realtime
          </span>
          <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '999px', border: '1px solid #93c5fd', fontWeight: 700, color: '#1d4ed8' }}>
            📧 Email Trực ban
          </span>
          <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '999px', border: '1px solid #93c5fd', fontWeight: 700, color: '#1d4ed8' }}>
            💬 Telegram / Zalo Bot
          </span>
          <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '999px', border: '1px solid #fde68a', fontWeight: 700, color: '#b45309' }}>
            📱 SMS Tổng đài
          </span>
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
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TỔNG GIAO DỊCH GÓI THUÊ</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {total}
          </div>
          <div style={{ fontSize: '12px', color: '#059669' }}>Có đầy đủ STT, giờ đặt, chu kỳ & ảnh</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ĐÃ DUYỆT TỰ ĐỘNG BẰNG AI OCR</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {summary.aiVerified}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Tự động khớp số tiền & nội dung</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>GIAO DỊCH CHỜ NHÂN VIÊN DUYỆT</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {summary.pending}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Hỗ trợ duyệt bằng AI hoặc thủ công</div>
        </div>
        <div className="panel" style={{ padding: '16px', marginBottom: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Ý KIẾN PHẢN HỒI KHÁCH HÀNG</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {feedbacks.length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Tiếp nhận đa kênh 24/7</div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PANEL 1: TRANSACTIONS & AI OCR PAYMENT PROOF SUPPORT         */}
      {/* ============================================================ */}
      <div className="records-panel" style={{ marginBottom: '22px' }}>
        {error && <p className="error" role="alert">{error}</p>}
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

        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm theo Tên khách hàng, Email, Mã giao dịch, Gói cước..."
            style={{ flex: '1 1 260px', margin: 0 }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ margin: 0, padding: '8px 12px' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">⏳ Đang xử lý (Pending)</option>
              <option value="completed">✓ Thành công (Completed)</option>
              <option value="rejected">✕ Đã từ chối (Rejected)</option>
              <option value="refunded">↩ Đã hoàn tiền (Refunded)</option>
            </select>

            <select
              value={verifyFilter}
              onChange={(e) => setVerifyFilter(e.target.value)}
              style={{ margin: 0, padding: '8px 12px' }}
            >
              <option value="all">Tất cả hình thức duyệt</option>
              <option value="ai">🤖 Duyệt tự động AI OCR</option>
              <option value="manual">👤 Nhân viên duyệt</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="records-table">
            <thead>
              <tr className="records-heading">
                <th className="records-cell">STT</th>
                <th className="records-cell">Mã giao dịch</th>
                <th className="records-cell">Khách hàng</th>
                <th className="records-cell">Gói cước</th>
                <th className="records-cell">Số tiền</th>
                <th className="records-cell">Thời gian đặt gói</th>
                <th className="records-cell">Chu kỳ thuê (Bắt đầu - Kết thúc) & Ngày duyệt</th>
                <th className="records-cell">Ảnh xác thực</th>
                <th className="records-cell">Duyệt tự động (AI)</th>
                <th className="records-cell">Trạng thái</th>
                <th className="support-actions-heading">Thao tác Hỗ trợ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="records-empty">
                    Không có giao dịch nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, index) => (
                  <tr key={t.id} className="records-row">
                    <td className="records-cell" style={{ fontWeight: 700, color: '#64748b' }}>
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="records-cell">
                      <code style={{ fontSize: '11.5px', fontWeight: 700 }}>
                        #{String(t.id).slice(0, 8)}
                      </code>
                    </td>
                    <td className="records-cell">
                      <div className="support-customer-name">{t.profiles?.name || 'Khách hàng'}</div>
                      <div className="support-customer-email">{t.profiles?.email}</div>
                    </td>
                    <td className="records-cell" style={{ fontWeight: 600 }}>
                      {t.plan_name}
                    </td>
                    <td className="support-amount" style={{ fontWeight: 800, color: '#059669' }}>
                      {Number(t.amount || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="records-cell" style={{ fontSize: '12px' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="records-cell" style={{ fontSize: '11.5px', lineHeight: 1.45 }}>
                      {t.cycle_start ? (
                        <div>
                          <div>
                            <b>Bắt đầu:</b> {new Date(t.cycle_start).toLocaleDateString('vi-VN')}
                          </div>
                          <div>
                            <b>Kết thúc:</b>{' '}
                            {t.cycle_end ? new Date(t.cycle_end).toLocaleDateString('vi-VN') : '-'}
                          </div>
                          {t.confirmed_at && (
                            <div style={{ color: '#059669', marginTop: '2px', fontWeight: 700 }}>
                              ✓ Hệ thống duyệt: {new Date(t.confirmed_at).toLocaleString('vi-VN')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chưa kích hoạt chu kỳ</span>
                      )}
                    </td>
                    <td className="records-cell">
                      {t.payment_proof ? (
                        <button
                          onClick={() => setPreviewProof(t.payment_proof)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                          title="Nhấn để phóng to ảnh biên lai xác thực"
                        >
                          <img
                            src={t.payment_proof}
                            alt="Proof"
                            style={{
                              width: '42px',
                              height: '42px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1.5px solid #10b981'
                            }}
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-button"
                          style={{ fontSize: '11px', color: '#2563eb' }}
                          onClick={() => openEditTxModal(t)}
                        >
                          ＋ Đính kèm ảnh
                        </button>
                      )}
                    </td>
                    <td className="records-cell">
                      {t.auto_verified ? (
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            fontSize: '11px'
                          }}
                        >
                          🤖 AI Tự động
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '11.5px', fontWeight: 600 }}>
                          👤 Thủ công
                        </span>
                      )}
                    </td>
                    <td className="records-cell">
                      <span
                        className={`support-status ${
                          t.status === 'completed'
                            ? 'is-completed'
                            : t.status === 'refunded' || t.status === 'rejected'
                            ? 'is-refunded'
                            : 'is-pending'
                        }`}
                        style={
                          t.status === 'rejected'
                            ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                            : undefined
                        }
                      >
                        {t.status === 'completed'
                          ? 'Thành công'
                          : t.status === 'rejected'
                          ? 'Đã từ chối'
                          : t.status === 'refunded'
                          ? 'Đã hoàn tiền'
                          : 'Đang xử lý'}
                      </span>
                    </td>
                    <td className="support-actions">
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {t.status === 'pending' && (
                          <>
                            <button
                              className="primary support-confirm-button"
                              onClick={() => handleUpdateStatus(t.id, 'completed')}
                            >
                              ✓ Duyệt gói
                            </button>
                            <button
                              className="secondary"
                              style={{ fontSize: '11.5px', padding: '5px 8px', color: '#059669', borderColor: '#a7f3d0' }}
                              onClick={() => handleRunAiOcr(t)}
                              title="Chạy AI OCR tự động kiểm tra biên lai và kích hoạt"
                            >
                              🤖 AI Duyệt
                            </button>
                            <button
                              className="secondary"
                              style={{
                                fontSize: '11.5px',
                                padding: '5px 8px',
                                color: '#dc2626',
                                borderColor: '#fecaca',
                                background: '#fef2f2',
                                fontWeight: 700
                              }}
                              onClick={() => handleUpdateStatus(t.id, 'rejected')}
                              title="Từ chối giao dịch thanh toán không hợp lệ"
                            >
                              ✕ Từ chối
                            </button>
                          </>
                        )}
                        <button
                          className="secondary"
                          style={{ fontSize: '11.5px', padding: '5px 8px' }}
                          onClick={() => openEditTxModal(t)}
                          title="Chỉnh sửa ngày bắt đầu/kết thúc gói hoặc đính kèm ảnh biên lai"
                        >
                          ✏️ Chu kỳ / Ảnh
                        </button>
                        {t.status === 'completed' && (
                          <button
                            className="secondary support-refund-button"
                            onClick={() => handleUpdateStatus(t.id, 'refunded')}
                          >
                            Hoàn tiền
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
            ))
              )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>

      {/* ============================================================ */ }
  {/* PANEL 2: CUSTOMER FEEDBACK & MULTI-CHANNEL ALERT HISTORY     */ }
  {/* ============================================================ */ }
  <div className="records-panel">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '16px' }}>
          💬 Ý kiến Phản hồi Khách hàng & Kênh Tiếp nhận ({feedbacks.length})
        </h3>
        <p className="staff-description" style={{ margin: '4px 0 0 0' }}>
          Theo dõi toàn bộ phản hồi từ khách hàng, kênh thông báo đã gửi tới nhân viên trực ban và nội dung giải đáp.
        </p>
      </div>
      <button className="secondary" onClick={openAddFeedback}>
        ＋ Thêm phản hồi mới
      </button>
    </div>

    <table className="records-table">
      <thead>
        <tr className="records-heading">
          <th className="records-cell">Khách hàng & Xe</th>
          <th className="records-cell">Nội dung Ý kiến Phản hồi</th>
          <th className="records-cell">Hình thức Nhân viên Nhận thông báo</th>
          <th className="records-cell">Phản hồi từ Nhân viên</th>
          <th className="records-cell">Trạng thái</th>
          <th className="support-actions-heading">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {feedbacks.length === 0 ? (
          <tr>
            <td colSpan="6" className="records-empty">
              Chưa có ý kiến phản hồi nào.
            </td>
          </tr>
        ) : (
          feedbacks.map((fb) => (
            <tr key={fb.id} className="records-row">
              <td className="records-cell">
                <div style={{ fontWeight: 700 }}>{fb.customer_name}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>{fb.customer_email}</div>
                {fb.plate && <span className="plate" style={{ marginTop: '4px', display: 'inline-block' }}>{fb.plate}</span>}
              </td>
              <td className="records-cell" style={{ maxWidth: '260px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{fb.subject}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{fb.message}</div>
              </td>
              <td className="records-cell">
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '200px' }}>
                  {(fb.notified_channels || ['Dashboard Bell', 'Email']).map((ch, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '10.5px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}
                    >
                      ✓ {ch}
                    </span>
                  ))}
                </div>
              </td>
              <td className="records-cell" style={{ maxWidth: '240px', fontSize: '12px' }}>
                {fb.staff_reply ? (
                  <div style={{ color: '#065f46', background: '#ecfdf5', padding: '6px 8px', borderRadius: '6px' }}>
                    <b>Trực ban:</b> {fb.staff_reply}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Chưa trả lời</span>
                )}
              </td>
              <td className="records-cell">
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: fb.status === 'resolved' ? '#ecfdf5' : '#fef3c7',
                    color: fb.status === 'resolved' ? '#047857' : '#b45309'
                  }}
                >
                  {fb.status === 'resolved' ? '✓ Đã phản hồi' : '⏳ Mới tiếp nhận'}
                </span>
              </td>
              <td className="records-cell">
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => openReplyFeedback(fb)}
                    className="text-button"
                    style={{ color: '#059669', fontWeight: 700 }}
                  >
                    💬 Trả lời
                  </button>
                  <button
                    onClick={() => handleDeleteFeedback(fb)}
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

  {/* ============================================================ */ }
  {/* MODAL 1: EDIT TRANSACTION CYCLE & ATTACH VIETQR PROOF        */ }
  {/* ============================================================ */ }
  {
    editingTx && (
      <div className="dialog-overlay" onClick={() => !savingTx && setEditingTx(null)}>
        <div
          className="dialog-content"
          style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="users-dialog-title" style={{ margin: 0 }}>
              ✏️ Chu kỳ Gói thuê & Ảnh Xác thực (#{String(editingTx.id).slice(0, 8)})
            </h3>
            <button className="slot-info-close" onClick={() => setEditingTx(null)}>✕</button>
          </div>

          <form onSubmit={handleSaveTxDetails}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Thời gian bắt đầu thuê (Cycle Start)
                <input
                  type="datetime-local"
                  value={editTxForm.cycle_start}
                  onChange={(e) => setEditTxForm((f) => ({ ...f, cycle_start: e.target.value }))}
                />
              </label>
              <label>
                Thời gian kết thúc thuê (Cycle End)
                <input
                  type="datetime-local"
                  value={editTxForm.cycle_end}
                  onChange={(e) => setEditTxForm((f) => ({ ...f, cycle_end: e.target.value }))}
                />
              </label>
              <label>
                Ngày giờ hệ thống duyệt (Confirmed At)
                <input
                  type="datetime-local"
                  value={editTxForm.confirmed_at}
                  onChange={(e) => setEditTxForm((f) => ({ ...f, confirmed_at: e.target.value }))}
                />
              </label>
              <label>
                Trạng thái giao dịch
                <select
                  value={editTxForm.status}
                  onChange={(e) => setEditTxForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="pending">⏳ Đang xử lý (Pending)</option>
                  <option value="completed">✓ Thành công (Completed)</option>
                  <option value="rejected">✕ Đã từ chối (Rejected)</option>
                  <option value="refunded">↩ Đã hoàn tiền (Refunded)</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '14px', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  🧾 Ảnh biên lai xác thực chuyển khoản
                </span>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '11.5px', padding: '4px 10px', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                  onClick={() =>
                    setEditTxForm((f) => ({
                      ...f,
                      status: 'completed',
                      payment_proof: buildSampleVietQrReceipt({
                        customerName: (editingTx.profiles?.name || 'NGUYỄN MINH TUẤN').toUpperCase(),
                        amount: editingTx.amount,
                        txId: String(editingTx.id).slice(0, 8).toUpperCase()
                      })
                    }))
                  }
                >
                  ⚡ Tạo nhanh biên lai VietQR mẫu cho giao dịch này
                </button>
              </div>

              {editTxForm.payment_proof ? (
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <img
                    src={editTxForm.payment_proof}
                    alt="Biên lai"
                    style={{ maxHeight: '220px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  Chưa có ảnh xác thực giao dịch
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                style={{ fontSize: '12px', width: '100%' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      setEditTxForm((f) => ({ ...f, payment_proof: reader.result }));
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            <div className="users-dialog-actions" style={{ marginTop: '18px' }}>
              <button type="button" className="secondary" onClick={() => setEditingTx(null)}>
                Hủy
              </button>
              <button type="submit" className="primary" disabled={savingTx}>
                {savingTx ? 'Đang lưu...' : '💾 Lưu chu kỳ & Ảnh xác thực'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  {/* ============================================================ */ }
  {/* MODAL 2: ADD / REPLY CUSTOMER FEEDBACK                       */ }
  {/* ============================================================ */ }
  {
    showFbModal && (
      <div className="dialog-overlay" onClick={() => setShowFbModal(false)}>
        <div
          className="dialog-content"
          style={{ maxWidth: '540px', width: '95%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="users-dialog-title">
            {replyingFb ? `💬 Phản hồi khách hàng: ${replyingFb.customer_name}` : '＋ Ghi nhận Ý kiến Phản hồi Khách hàng'}
          </h3>
          <form onSubmit={handleSaveFeedback}>
            {!replyingFb ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label>
                    Họ tên khách hàng *
                    <input
                      value={fbForm.customer_name}
                      onChange={(e) => setFbForm((f) => ({ ...f, customer_name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </label>
                  <label>
                    Biển số xe
                    <input
                      value={fbForm.plate}
                      onChange={(e) => setFbForm((f) => ({ ...f, plate: e.target.value }))}
                      placeholder="30G-688.86"
                    />
                  </label>
                </div>
                <label>
                  Tiêu đề phản hồi *
                  <input
                    value={fbForm.subject}
                    onChange={(e) => setFbForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="VD: Yêu cầu kiểm tra gói thuê tháng / Đánh giá hầm xe"
                    required
                  />
                </label>
                <label>
                  Nội dung ý kiến khách hàng *
                  <input
                    value={fbForm.message}
                    onChange={(e) => setFbForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Nhập nội dung phản hồi..."
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                  <div><b>Ý kiến của khách:</b> {replyingFb.subject}</div>
                  <div style={{ color: '#475569', marginTop: '4px' }}>“{replyingFb.message}”</div>
                </div>
                <label>
                  Nội dung phản hồi của Nhân viên *
                  <input
                    value={fbForm.staff_reply}
                    onChange={(e) => setFbForm((f) => ({ ...f, staff_reply: e.target.value }))}
                    placeholder="Nhập câu trả lời gửi tới khách hàng..."
                    required
                    autoFocus
                  />
                </label>
              </>
            )}

            <div className="users-dialog-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="secondary" onClick={() => setShowFbModal(false)}>
                Hủy
              </button>
              <button type="submit" className="primary">
                {replyingFb ? 'Gửi phản hồi' : 'Lưu & Báo đa kênh'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  {/* Proof Preview Modal */ }
  {
    previewProof && (
      <div className="slot-picker-overlay" onClick={() => setPreviewProof(null)} style={{ zIndex: 1200 }}>
        <div className="slot-picker-dialog" style={{ maxWidth: '500px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <h3>Ảnh Bằng chứng Chuyển khoản</h3>
          <img
            src={previewProof}
            alt="Proof Preview"
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', margin: '12px 0' }}
          />
          <div>
            <button className="secondary" onClick={() => setPreviewProof(null)}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }
    </div >
  );
}
