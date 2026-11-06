import { userDocumentsStore } from './supportStore.js';
import { NATIVE_SQL, runSql, sqlVal, sqlList, sqlSet } from './nativeSql.js';

export async function purgeSensitiveUserData(db, userId, reason = 'USER_TERMINATION') {
  if (!db || !userId) throw new Error('Invalid userId for zero-data purge.');

  const timestamp = new Date().toISOString();
  console.log(`[PRIVACY-ENGINE] Initiating Zero-Data Retention purge for user: ${userId}. Reason: ${reason}`);

  userDocumentsStore.delete(userId);

  const { data: vehicles } = await runSql(
    db,
    `SELECT id
     FROM public.vehicles
     WHERE user_id = ${sqlVal(userId)};`
  );
  const vehicleIds = (vehicles || []).map((v) => v.id);

  if (vehicleIds.length > 0) {
    await runSql(
      db,
      `UPDATE public.parking_slots
       SET vehicle_id = NULL, status = 'empty'
       WHERE vehicle_id IN ${sqlList(vehicleIds)};`
    );
    await runSql(
      db,
      `DELETE FROM public.parking_sessions
       WHERE vehicle_id IN ${sqlList(vehicleIds)};`
    );
    await runSql(
      db,
      `DELETE FROM public.vehicles
       WHERE user_id = ${sqlVal(userId)};`
    );
  }

  await runSql(
    db,
    `UPDATE public.transactions
     SET payment_proof = NULL, ai_ocr_result = NULL
     WHERE user_id = ${sqlVal(userId)};`
  );

  await runSql(
    db,
    `DELETE FROM public.notifications
     WHERE user_id = ${sqlVal(userId)};`
  );

  const fullZeroProfile = {
    phone: null,
    address: null,
    id_card_front: null,
    id_card_back: null,
    driver_license_front: null,
    driver_license_back: null,
    kyc_status: 'purged',
    name: 'Anonymous User'
  };

  let { error: profileError } = await runSql(
    db,
    `UPDATE public.profiles
     SET ${sqlSet(fullZeroProfile)}
     WHERE id = ${sqlVal(userId)};`
  );

  if (profileError) {
    const fallbackZero = {
      phone: null,
      address: null,
      id_card_front: null,
      id_card_back: null,
      kyc_status: 'purged',
      name: 'Anonymous User'
    };
    const fallback = await runSql(
      db,
      `UPDATE public.profiles
       SET ${sqlSet(fallbackZero)}
       WHERE id = ${sqlVal(userId)};`
    );
    profileError = fallback.error;
  }

  if (profileError) throw profileError;

  return {
    success: true,
    purgedAt: timestamp,
    status: 'ZERO_DATA_APPLIED',
    nativeSql: NATIVE_SQL.PURGE_USER_ZERO_DATA
  };
}
