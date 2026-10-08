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
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={reportData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000000}M`} />
            <Tooltip formatter={(val) => `${val.toLocaleString()} đ`} />
            <Bar dataKey="revenue" fill="#35583e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
