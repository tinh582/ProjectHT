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
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
        <form onSubmit={handleAddPricing} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <label style={{ flex: 1 }}>Gói (vd: Thẻ tháng Ô tô)
            <input value={newPlanType} onChange={e => setNewPlanType(e.target.value)} required />
          </label>
          <label style={{ flex: 1 }}>Giá (VNĐ)
            <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
          </label>
          <button type="submit" className="primary" style={{ marginBottom: '8px' }}>Thêm</button>
        </form>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eaeaea', background: '#f9faf9' }}>
              <th style={{ padding: '12px' }}>Gói cước</th>
              <th style={{ padding: '12px' }}>Đơn giá (VNĐ)</th>
              <th style={{ padding: '12px', width: '80px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {pricingConfigs.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Chưa có cấu hình giá nào.</td></tr>
            ) : pricingConfigs.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{p.plan_type}</td>
                <td style={{ padding: '12px', color: '#2a5340' }}>{p.price.toLocaleString()} đ</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleDeletePricing(p.id)} className="text-button" style={{ color: 'red', padding: 0 }}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
