import React from 'react';

export default function Pagination({ page, pageSize, total, onChange }) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return <nav className="pagination" aria-label="Phân trang">
    <button className="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</button>
    <span>Trang {page} / {lastPage} · {total} kết quả</span>
    <button className="secondary" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>Sau</button>
  </nav>;
}
