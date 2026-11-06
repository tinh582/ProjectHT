import express from 'express';
import { runSql, sqlVal } from '../../nativeSql.js';

const router = express.Router();

// Copy-pasteable Supabase SQL Editor queries:
// 1) SELECT * FROM public.vehicles WHERE id = '<VEHICLE_UUID>' LIMIT 1;
// 2) SELECT id, name, email, phone, address, kyc_status FROM public.profiles WHERE id = '<USER_UUID>' LIMIT 1;
// 3) SELECT id, entry_time, exit_time, status FROM public.parking_sessions WHERE vehicle_id = '<VEHICLE_UUID>' ORDER BY entry_time DESC LIMIT 10;
router.get('/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const { data: vehicle, error: vError } = await runSql(
    req.db,
    `SELECT *
     FROM public.vehicles
     WHERE id = ${sqlVal(vehicleId)}
     LIMIT 1;`,
    { single: true }
  );
  if (vError) throw vError;

  let profile = null;
  try {
    const { data: pData, error: pError } = await runSql(
      req.db,
      `SELECT id, name, email, phone, address, kyc_status
       FROM public.profiles
       WHERE id = ${sqlVal(vehicle.user_id)}
       LIMIT 1;`,
      { single: true }
    );
    if (pError) throw pError;
    profile = pData;
  } catch {
    const { data: pFallback, error: pFallbackError } = await runSql(
      req.db,
      `SELECT id, name, email
       FROM public.profiles
       WHERE id = ${sqlVal(vehicle.user_id)}
       LIMIT 1;`,
      { single: true }
    );
    if (pFallbackError) throw pFallbackError;
    profile = pFallback;
  }

  const { data: sessions } = await runSql(
    req.db,
    `SELECT id, entry_time, exit_time, status
     FROM public.parking_sessions
     WHERE vehicle_id = ${sqlVal(vehicleId)}
     ORDER BY entry_time DESC
     LIMIT 10;`
  );

  const activeSession = sessions?.find((s) => s.status === 'active') || null;

  res.json({ vehicle, profile, activeSession, sessions: sessions || [] });
});

export default router;
