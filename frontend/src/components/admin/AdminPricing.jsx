import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function AdminPricing() {
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [newPlanType, setNewPlanType] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    const response = await apiFetch('/api/components/admin/AdminPricing');
    if (!response.ok) return;
    const data = await response.json();
    setPricingConfigs(data || []);
  };

  const handleAddPricing = async (e) => {
    e.preventDefault();
    if (!newPlanType || !newPrice) return;
    const response = await apiFetch('/api/components/admin/AdminPricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_type: newPlanType, price: parseFloat(newPrice) })
    });
    if (response.ok) {
      setNewPlanType('');
      setNewPrice('');
      fetchPricing();
    } else {
      alert("Error adding pricing");
    }
  };

  const handleDeletePricing = async (id) => {
    if(window.confirm('Delete this pricing plan?')) {
      const response = await apiFetch(`/api/components/admin/AdminPricing/${id}`, { method: 'DELETE' });
      if (response.ok) fetchPricing();
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONFIGURATION</p>
          <h1>Thiết lập giá<span>.</span></h1>
        </div>
      </div>
      <div className="records-panel">
        <form onSubmit={handleAddPricing} className="pricing-form">
          <label className="pricing-field">Gói (vd: Thẻ tháng Ô tô)
            <input value={newPlanType} onChange={e => setNewPlanType(e.target.value)} required />
          </label>
          <label className="pricing-field">Giá (VNĐ)
            <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
          </label>
          <button type="submit" className="primary admin-add-button">Thêm</button>
        </form>

        <table className="records-table">
          <thead>
            <tr className="records-heading">
              <th className="records-cell">Gói cước</th>
              <th className="records-cell">Đơn giá (VNĐ)</th>
              <th className="pricing-actions-heading">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {pricingConfigs.length === 0 ? (
              <tr><td colSpan="3" className="records-empty">Chưa có cấu hình giá nào.</td></tr>
            ) : pricingConfigs.map(p => (
              <tr key={p.id} className="records-row">
                <td className="pricing-plan-cell">{p.plan_type}</td>
                <td className="pricing-price-cell">{p.price.toLocaleString()} đ</td>
                <td className="records-cell">
                  <button onClick={() => handleDeletePricing(p.id)} className="text-button pricing-delete-button">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
