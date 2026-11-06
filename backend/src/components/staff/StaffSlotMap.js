import express from 'express';
import { NATIVE_SQL, runSql } from '../../nativeSql.js';

const router = express.Router();

export function computeParkingMapSummary(zones = [], slots = []) {
  const safeZones = Array.isArray(zones) ? zones : [];
  const safeSlots = Array.isArray(slots) ? slots : [];

  const zoneBreakdown = safeZones.map((z) => {
    const zSlots = safeSlots.filter((s) => String(s.zone_id) === String(z.id));
    const totalSlots = zSlots.length;
    const totalCapacity = Number(z.total_capacity || totalSlots || 0);
    const occupied = zSlots.filter((s) => s.status === 'occupied').length;
    const rentedOnly = zSlots.filter((s) => s.status === 'rented').length;
    const maintenance = zSlots.filter((s) => s.status === 'maintenance').length;
    const empty = zSlots.filter((s) => !s.status || s.status === 'empty' || s.status === 'available').length;
    const totalRented = occupied + rentedOnly;
    const baseDenominator = totalSlots > 0 ? totalSlots : totalCapacity || 1;
    const rentalRate = Math.round((totalRented / baseDenominator) * 100);
    const occupancyRate = Math.round((occupied / baseDenominator) * 100);

    return {
      ...z,
      stats: {
        totalCapacity,
        totalSlots,
        totalRented,
        occupied,
        rentedOnly,
        empty,
        maintenance,
        uncreatedSlots: Math.max(0, totalCapacity - totalSlots),
        rentalRate,
        occupancyRate
      }
    };
  });

  const totalZones = safeZones.length;
  const totalCapacity = safeZones.reduce((sum, z) => sum + Number(z.total_capacity || 0), 0);
  const totalSlots = safeSlots.length;
  const occupiedSlots = safeSlots.filter((s) => s.status === 'occupied').length;
  const rentedOnlySlots = safeSlots.filter((s) => s.status === 'rented').length;
  const totalRentedSlots = occupiedSlots + rentedOnlySlots;
  const emptySlots = safeSlots.filter((s) => !s.status || s.status === 'empty' || s.status === 'available').length;
  const maintenanceSlots = safeSlots.filter((s) => s.status === 'maintenance').length;

  const baseTotal = totalSlots > 0 ? totalSlots : totalCapacity || 1;
  const rentalRate = totalSlots > 0 || totalCapacity > 0 ? Math.round((totalRentedSlots / baseTotal) * 100) : 0;
  const occupancyRate = totalSlots > 0 || totalCapacity > 0 ? Math.round((occupiedSlots / baseTotal) * 100) : 0;
  const emptyRate = totalSlots > 0 || totalCapacity > 0 ? Math.round((emptySlots / baseTotal) * 100) : 0;

  return {
    zones: zoneBreakdown,
    summary: {
      totalZones,
      totalCapacity,
      totalSlots,
      totalRentedSlots,
      occupiedSlots,
      rentedOnlySlots,
      emptySlots,
      maintenanceSlots,
      uncreatedSlots: Math.max(0, totalCapacity - totalSlots),
      rentalRate,
      occupancyRate,
      emptyRate
    }
  };
}

// Copy-pasteable Supabase SQL Editor queries:
// 1) SELECT * FROM public.v_parking_map_zone_summary;
// 2) SELECT * FROM public.v_parking_map_overall_summary;
// 3) SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, v.id, v.plate, v.type, v.brand, v.model, v.color FROM public.parking_slots s LEFT JOIN public.vehicles v ON v.id = s.vehicle_id;
router.get('/', async (req, res) => {
  let zData = [];
  let sData = [];

  try {
    const [zoneResult, slotResult] = await Promise.all([
      runSql(
        req.db,
        `SELECT id, zone_name, vehicle_type, total_capacity, current_occupancy, drainage_status, sensor_status, cctv_coverage, lighting_status
         FROM public.parking_zones
         ORDER BY created_at;`
      ),
      runSql(
        req.db,
        `SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, v.id, v.plate, v.type, v.brand, v.model, v.color
         FROM public.parking_slots s
         LEFT JOIN public.vehicles v ON v.id = s.vehicle_id;`
      )
    ]);
    if (zoneResult.error) throw zoneResult.error;
    if (slotResult.error) throw slotResult.error;
    zData = zoneResult.data || [];
    sData = slotResult.data || [];
  } catch {
    const [zoneFallback, slotFallback] = await Promise.all([
      runSql(
        req.db,
        `SELECT id, zone_name, vehicle_type, total_capacity, current_occupancy
         FROM public.parking_zones
         ORDER BY created_at;`
      ),
      runSql(
        req.db,
        `SELECT s.id, s.zone_id, s.slot_name, s.status, s.vehicle_id, v.plate
         FROM public.parking_slots s
         LEFT JOIN public.vehicles v ON v.id = s.vehicle_id;`
      )
    ]);
    if (zoneFallback.error) throw zoneFallback.error;
    if (slotFallback.error) throw slotFallback.error;
    zData = zoneFallback.data || [];
    sData = slotFallback.data || [];
  }

  const { zones, summary } = computeParkingMapSummary(zData, sData);
  res.json({
    zones,
    slots: sData,
    summary,
    nativeSql: {
      zoneSummarySql: NATIVE_SQL.PARKING_MAP_ZONE_SUMMARY,
      overallSummarySql: NATIVE_SQL.PARKING_MAP_OVERALL_SUMMARY
    }
  });
});

export default router;
