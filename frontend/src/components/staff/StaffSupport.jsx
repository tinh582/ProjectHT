import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import Pagination from '../shared/Pagination';
import { readPage } from '../../lib/pagination';

export default function StaffSupport() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const pageSize = 25;

  useEffect(() => {
    fetchTransactions();
  }, [page]);

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
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (window.confirm(`Xác nhận chuyển trạng thái thành ${status}?`)) {
      const response = await apiFetch(`/api/components/staff/StaffSupport/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) fetchTransactions();
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER SUPPORT</p>
          <h1>Hỗ trợ & Thanh toán<span>.</span></h1>
        </div>
      </div>
      <div className="records-panel">
        {error && <p className="error" role="alert">{error}</p>}
        <p className="staff-description">Danh sách các giao dịch gần đây. Nhân viên có thể hỗ trợ xác nhận thanh toán lỗi hoặc hoàn tiền.</p>
        <table className="records-table">
          <thead>
            <tr className="records-heading">
              <th className="records-cell">Khách hàng</th>
              <th className="records-cell">Gói cước</th>
              <th className="records-cell">Số tiền</th>
              <th className="records-cell">Trạng thái</th>
              <th className="support-actions-heading">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="5" className="records-empty">Chưa có giao dịch nào.</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="records-row">
                <td className="records-cell">
                  <div className="support-customer-name">{t.profiles?.name || 'Khách'}</div>
                  <div className="support-customer-email">{t.profiles?.email}</div>
                </td>
                <td className="records-cell">{t.plan_name}</td>
                <td className="support-amount">{Number(t.amount).toLocaleString()} đ</td>
                <td className="records-cell">
                  <span className={`support-status ${t.status === 'completed' ? 'is-completed' : t.status === 'refunded' ? 'is-refunded' : 'is-pending'}`}>
                    {t.status === 'completed' ? 'Thành công' : t.status === 'refunded' ? 'Đã hoàn tiền' : 'Đang xử lý'}
                  </span>
                </td>
                <td className="support-actions">
                  {t.status === 'pending' && (
                    <button className="primary support-confirm-button" onClick={() => handleUpdateStatus(t.id, 'completed')}>Xác nhận</button>
                  )}
                  {t.status === 'completed' && (
                    <button className="secondary support-refund-button" onClick={() => handleUpdateStatus(t.id, 'refunded')}>Hoàn tiền</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </div>
    </div>
  );
}
