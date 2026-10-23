import express from 'express';
import { rpc } from '../../http.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const p_time_zone = process.env.REPORT_TIME_ZONE || 'Asia/Ho_Chi_Minh';
  
  let baseReport = {};
  try {
    baseReport = await rpc(req.db, 'parking_report', { p_time_zone });
  } catch (err) {
    console.warn('Base parking_report rpc failed, computing fallback report:', err.message);
  }

  const [carZones, carSlots, carSessions, activeSubscriptions] = await Promise.all([
    req.db.from('parking_zones').select('id, zone_name, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status').eq('vehicle_type', 'Ô tô'),
    req.db.from('parking_slots').select('id, status, zone_id').in('status', ['empty', 'rented', 'occupied']),
    req.db.from('parking_sessions').select('id, vehicle_id, status, vehicles!inner(type)').eq('vehicles.type', 'Ô tô').eq('status', 'active'),
    req.db.from('transactions').select('id, amount, plan_name, confirmed_at, created_at').eq('status', 'completed'),
  ]);

  const carZoneData = carZones.data || [];
  const carCapacity = carZoneData.reduce((acc, z) => acc + (z.total_capacity || 0), 0);
  const carActiveInLot = (carSessions.data || []).length;
  const carOccupancy = carZoneData.reduce((acc, z) => acc + (z.current_occupancy || 0), 0);
  const carAvailable = Math.max(0, carCapacity - carOccupancy);

  const allTx = activeSubscriptions.data || [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  let carDailyRevenue = 0;
  let carWeeklyRevenue = 0;
  let carMonthlyRevenue = 0;
  const revenueByPlan = {};

  allTx.forEach(tx => {
    const amt = Number(tx.amount || 0);
    const txDate = new Date(tx.confirmed_at || tx.created_at);
    if (tx.confirmed_at && tx.confirmed_at.startsWith(todayStr)) {
      carDailyRevenue += amt;
    }
    if (txDate >= oneWeekAgo) {
      carWeeklyRevenue += amt;
    }
    if (txDate >= oneMonthAgo) {
      carMonthlyRevenue += amt;
    }
    const pName = tx.plan_name || 'Gói tiêu chuẩn';
    revenueByPlan[pName] = (revenueByPlan[pName] || 0) + amt;
  });

  res.json({
    ...baseReport,
    carMetrics: {
      carCapacity,
      carActiveInLot,
      carAvailable,
      carOccupancyRate: carCapacity > 0 ? Math.round((carOccupancy / carCapacity) * 100) : 0,
      carDailyRevenue,
      carWeeklyRevenue,
      carMonthlyRevenue,
      revenueByPlan,
      activeCarSubscriptions: allTx.length,
      infrastructureZones: carZoneData,
    }
  });
});

export default router;