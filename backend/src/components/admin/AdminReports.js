import express from 'express';
import { runSql, sqlVal } from '../../nativeSql.js';
const router = express.Router();

// Copy-pasteable Supabase SQL Editor queries:
// 1) SELECT public.parking_report('Asia/Ho_Chi_Minh');
// 2) SELECT id, zone_name, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status FROM public.parking_zones WHERE vehicle_type = 'Ô tô';
// 3) SELECT id, status, zone_id FROM public.parking_slots WHERE status IN ('empty', 'rented', 'occupied');
// 4) SELECT ps.id, ps.vehicle_id, ps.status, v.type FROM public.parking_sessions ps INNER JOIN public.vehicles v ON v.id = ps.vehicle_id WHERE v.type = 'Ô tô' AND ps.status = 'active';
// 5) SELECT id, amount, plan_name, confirmed_at, created_at FROM public.transactions WHERE status = 'completed';
router.get(['/', '/car-metrics'], async (req, res) => {
  const p_time_zone = process.env.REPORT_TIME_ZONE || 'Asia/Ho_Chi_Minh';

  let baseReport = {};
  try {
    const rpcRes = await runSql(
      req.db,
      `SELECT public.parking_report(${sqlVal(p_time_zone)});`
    );
    baseReport = rpcRes.data || {};
  } catch (err) {
    console.warn('Base parking_report rpc failed, computing fallback report:', err.message);
  }

  const [carZones, carSlots, carSessions, activeSubscriptions] = await Promise.all([
    runSql(
      req.db,
      `SELECT id, zone_name, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status
       FROM public.parking_zones
       WHERE vehicle_type = 'Ô tô';`
    ),
    runSql(
      req.db,
      `SELECT id, status, zone_id
       FROM public.parking_slots
       WHERE status IN ('empty', 'rented', 'occupied');`
    ),
    runSql(
      req.db,
      `SELECT ps.id, ps.vehicle_id, ps.status, v.type
       FROM public.parking_sessions ps
       INNER JOIN public.vehicles v ON v.id = ps.vehicle_id
       WHERE v.type = 'Ô tô' AND ps.status = 'active';`
    ),
    runSql(
      req.db,
      `SELECT id, amount, plan_name, confirmed_at, created_at
       FROM public.transactions
       WHERE status = 'completed';`
    )
  ]);

  const carZoneData = Array.isArray(carZones.data) ? carZones.data : [];
  const carCapacity = carZoneData.reduce((acc, z) => acc + (z.total_capacity || 0), 0);
  const carActiveInLot = Array.isArray(carSessions.data) ? carSessions.data.length : 0;
  const carOccupancy = carZoneData.reduce((acc, z) => acc + (z.current_occupancy || 0), 0);
  const carAvailable = Math.max(0, carCapacity - carOccupancy);

  const allTx = Array.isArray(activeSubscriptions.data) ? activeSubscriptions.data : [];
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
