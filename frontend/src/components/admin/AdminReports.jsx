import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminReports() {
  const [reportData, setReportData] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);

  const [todayTraffic, setTodayTraffic] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [availableSpots, setAvailableSpots] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    const response = await apiFetch('/api/components/admin/AdminReports');
    if (response.ok) {
      const data = await response.json();
      setTodayTraffic(data.todayTraffic);
      setActiveSessions(data.activeSessions);
      setAvailableSpots(data.availableSpots);
      setOccupancyRate(data.occupancyRate);
      setTodayRevenue(data.todayRevenue);
      setReportData(data.reportData);
    }
  };

  const maxRevenue = Math.max(0, ...(reportData || []).map(d => d.revenue || 0));
  const yAxisDomain = [0, maxRevenue > 0 ? 'auto' : 1000000];

  const formatYAxis = (val) => {
    if (val === 0) return '0 đ';
    if (val >= 1000000) return `${(val / 1000000).toLocaleString('vi-VN')} tr`;
    if (val >= 1000) return `${(val / 1000).toLocaleString('vi-VN')} k`;
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ANALYTICS</p>
          <h1>Báo cáo & Thống kê<span>.</span></h1>
        </div>
      </div>
      <div className="stats">
        <div><span>Doanh thu hôm nay</span><strong>{todayRevenue.toLocaleString()} đ</strong><small>Từ tất cả các gói</small></div>
        <div><span>Lượt xe ra vào</span><strong>{todayTraffic}</strong><small>Đang hoạt động: {activeSessions}</small></div>
        <div><span>Chỗ trống hiện tại</span><strong>{availableSpots.toLocaleString()}</strong><small>Tỷ lệ lấp đầy: {occupancyRate}%</small></div>
      </div>

      <div className="report-chart-panel">
        <h3 className="report-chart-title">Biểu đồ doanh thu 7 ngày qua</h3>
        <div className="report-chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={reportData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} dy={8} />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={yAxisDomain}
                allowDecimals={false}
                width={70}
                tick={{ fill: '#666', fontSize: 12 }}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                cursor={{ fill: 'rgba(53, 88, 62, 0.06)' }}
                formatter={(val) => [`${val.toLocaleString()} đ`, 'Doanh thu']}
                labelFormatter={(label) => `Ngày ${label}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '13px'
                }}
              />
              <Bar dataKey="revenue" fill="#35583e" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
