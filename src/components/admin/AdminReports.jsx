import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminReports() {
  const [reportData, setReportData] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  
  const [todayTraffic, setTodayTraffic] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [availableSpots, setAvailableSpots] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch traffic
    const { data: sessions } = await supabase.from('parking_sessions').select('*');
    if (sessions) {
      const todaySessions = sessions.filter(s => s.entry_time && s.entry_time.startsWith(today) || (s.exit_time && s.exit_time.startsWith(today)));
      setTodayTraffic(todaySessions.length);
      
      const active = sessions.filter(s => s.status === 'active');
      setActiveSessions(active.length);
    }
    
    // Fetch zones capacity
    const { data: zones } = await supabase.from('parking_zones').select('*');
    if (zones) {
      let totalCap = 0;
      let currOcc = 0;
      zones.forEach(z => {
        totalCap += z.total_capacity;
        currOcc += z.current_occupancy;
      });
      
      setAvailableSpots(Math.max(0, totalCap - currOcc));
      setOccupancyRate(totalCap > 0 ? Math.round((currOcc / totalCap) * 100) : 0);
    }
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*').eq('status', 'completed');
    if (!data) return;

    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    let todayRev = 0;
    const grouped = last7Days.map(date => {
      const dayTotal = data
        .filter(t => t.created_at.startsWith(date))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      if (date === new Date().toISOString().split('T')[0]) {
        todayRev = dayTotal;
      }
      
      const parts = date.split('-');
      return {
        name: `${parts[2]}/${parts[1]}`,
        revenue: dayTotal
      };
    });

    setTodayRevenue(todayRev);
    setReportData(grouped);
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
      
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eaeaea', height: '400px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Biểu đồ doanh thu 7 ngày qua</h3>
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
