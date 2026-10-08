import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import Pagination from '../shared/Pagination';

export default function StaffSupport() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchTransactions = async () => {
    const response = await apiFetch(`/api/components/staff/StaffSupport?page=${page}&pageSize=${pageSize}`);
    if (response.ok) {
      const data = await response.json();
      setTransactions(data.items);
      setTotal(data.total);
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
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
        <p style={{ color: '#666', marginBottom: '20px' }}>Danh sách các giao dịch gần đây. Nhân viên có thể hỗ trợ xác nhận thanh toán lỗi hoặc hoàn tiền.</p>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eaeaea', background: '#f9faf9' }}>
              <th style={{ padding: '12px' }}>Khách hàng</th>
              <th style={{ padding: '12px' }}>Gói cước</th>
              <th style={{ padding: '12px' }}>Số tiền</th>
              <th style={{ padding: '12px' }}>Trạng thái</th>
              <th style={{ padding: '12px', width: '180px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Chưa có giao dịch nào.</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: '500' }}>{t.profiles?.name || 'Khách'}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{t.profiles?.email}</div>
                </td>
                <td style={{ padding: '12px' }}>{t.plan_name}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{Number(t.amount).toLocaleString()} đ</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    color: t.status === 'completed' ? 'green' : t.status === 'refunded' ? 'red' : 'orange', 
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {t.status === 'completed' ? 'Thành công' : t.status === 'refunded' ? 'Đã hoàn tiền' : 'Đang xử lý'}
                  </span>
                </td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                  {t.status === 'pending' && (
                    <button className="primary" onClick={() => handleUpdateStatus(t.id, 'completed')} style={{ padding: '6px 10px', fontSize: '10px' }}>Xác nhận</button>
                  )}
                  {t.status === 'completed' && (
                    <button className="secondary" onClick={() => handleUpdateStatus(t.id, 'refunded')} style={{ padding: '6px 10px', fontSize: '10px', color: 'red' }}>Hoàn tiền</button>
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
