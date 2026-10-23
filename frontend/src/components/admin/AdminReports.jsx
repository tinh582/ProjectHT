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

  const [carMetrics, setCarMetrics] = useState(null);
  const [filterType, setFilterType] = useState('car'); // 'car' | 'all'

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
      if (data.carMetrics) {
        setCarMetrics(data.carMetrics);
      }
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
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p className="eyebrow">ANALYTICS & CAR-CENTRIC INSIGHTS</p>
          <h1>Báo cáo & Thống kê Chuyên sâu<span>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={filterType === 'car' ? 'primary' : 'secondary'}
            onClick={() => setFilterType('car')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            🚗 Trọng tâm: Ô tô (Car-Centric)
          </button>
          <button
            className={filterType === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilterType('all')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            📊 Toàn bộ bãi xe
          </button>
        </div>
      </div>

      <div className="stats">
        <div>
          <span>{filterType === 'car' ? 'Chỗ trống ô tô (Real-time)' : 'Chỗ trống hiện tại'}</span>
          <strong>{filterType === 'car' && carMetrics ? carMetrics.carAvailable : availableSpots}</strong>
          <small>Tỷ lệ lấp đầy: {filterType === 'car' && carMetrics ? carMetrics.carOccupancyRate : occupancyRate}%</small>
        </div>

        <div>
          <span>{filterType === 'car' ? 'Xe ô tô đang trong bãi' : 'Xe đang hoạt động'}</span>
          <strong>{filterType === 'car' && carMetrics ? carMetrics.carActiveInLot : activeSessions}</strong>
          <small>Sức chứa ô tô: {carMetrics?.carCapacity || 100} chỗ</small>
        </div>

        <div>
          <span>Gói cước đang hoạt động</span>
          <strong>{carMetrics?.activeCarSubscriptions || 0}</strong>
          <small>Tổng lượt thuê ô tô hiệu lực</small>
        </div>

        <div>
          <span>Doanh thu hôm nay</span>
          <strong>{(filterType === 'car' && carMetrics ? carMetrics.carDailyRevenue : todayRevenue).toLocaleString()} đ</strong>
          <small>Tuần này: {(carMetrics?.carWeeklyRevenue || 0).toLocaleString()} đ</small>
        </div>
      </div>

      {/* Technical Infrastructure Status Overview */}
      {carMetrics?.infrastructureZones && (
        <div style={{
          background: '#fff',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #e0e0e0',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>🏢 Trạng thái Hạ tầng Kỹ thuật Khu vực Ô tô</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {carMetrics.infrastructureZones.map(zone => (
              <div key={zone.id} style={{ border: '1px solid #eee', padding: '12px', borderRadius: '8px', background: '#fafafa' }}>
                <strong style={{ fontSize: '15px' }}>{zone.zone_name}</strong>
                <div style={{ fontSize: '13px', marginTop: '6px' }}>💧 Thoát nước: <span style={{ color: '#2e7d32' }}>{zone.drainage_status || 'Tốt'}</span></div>
                <div style={{ fontSize: '13px' }}>📡 Cảm biến: <span style={{ color: '#2e7d32' }}>{zone.sensor_status || 'Hoạt động'}</span></div>
                <div style={{ fontSize: '13px' }}>📹 Camera: <span>{zone.cctv_coverage || 'Góc rộng 24/7'}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>📅 Doanh thu theo chu kỳ</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>Hôm nay:</span>
            <strong>{(carMetrics?.carDailyRevenue || 0).toLocaleString()} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>7 ngày qua:</span>
            <strong>{(carMetrics?.carWeeklyRevenue || 0).toLocaleString()} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>30 ngày qua (Tháng):</span>
            <strong>{(carMetrics?.carMonthlyRevenue || 0).toLocaleString()} đ</strong>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>📦 Doanh thu theo loại gói</h4>
          {carMetrics?.revenueByPlan && Object.entries(carMetrics.revenueByPlan).map(([name, val]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{name}:</span>
              <strong>{Number(val).toLocaleString()} đ</strong>
            </div>
          ))}
        </div>
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
