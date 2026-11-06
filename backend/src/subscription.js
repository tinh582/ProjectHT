import { runSql, sqlVal } from './nativeSql.js';

/**
 * Helper utilities to determine subscription and customer account activation status.
 */
export async function getSubscriptionStatus(db, userId) {
  if (!db || !userId) {
    return { isActive: false, expiryDate: null, hasPending: false, latestTransaction: null };
  }

  let data = null;
  let error = null;

  try {
    // Copy-pasteable Supabase SQL Editor query:
    // SELECT id, plan_name, amount, created_at, confirmed_at, cycle_start, cycle_end, verified_by, status FROM public.transactions WHERE user_id = '<USER_UUID>' AND status = 'completed' ORDER BY confirmed_at DESC LIMIT 1;
    const res = await runSql(
      db,
      `SELECT id, plan_name, amount, created_at, confirmed_at, cycle_start, cycle_end, verified_by, status
       FROM public.transactions
       WHERE user_id = ${sqlVal(userId)} AND status = 'completed'
       ORDER BY confirmed_at DESC
       LIMIT 1;`,
      { maybeSingle: true }
    );
    data = res.data;
    error = res.error;
  } catch (e) {
    error = e;
  }

  if (error && error.code === '42703') {
    try {
      const fallback = await runSql(
        db,
        `SELECT id, plan_name, amount, created_at, status
         FROM public.transactions
         WHERE user_id = ${sqlVal(userId)} AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT 1;`,
        { maybeSingle: true }
      );
      data = fallback.data;
    } catch (_) {}
  }

  let hasPending = false;
  try {
    const { data: pendingData } = await runSql(
      db,
      `SELECT id, plan_name, amount, created_at
       FROM public.transactions
       WHERE user_id = ${sqlVal(userId)} AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1;`,
      { maybeSingle: true }
    );
    if (pendingData) {
      hasPending = true;
    }
  } catch (_) {}

  let isActive = false;
  let expiryDate = null;

  if (data) {
    const purchaseDate = new Date(data.confirmed_at || data.created_at);
    if (data.cycle_end) {
      expiryDate = new Date(data.cycle_end).toISOString();
      isActive = new Date() <= new Date(data.cycle_end);
    } else if (!isNaN(purchaseDate.getTime())) {
      const expiry = new Date(purchaseDate);
      expiry.setDate(expiry.getDate() + 30);
      expiryDate = expiry.toISOString();
      isActive = new Date() <= expiry;
    }
  }

  return {
    isActive,
    expiryDate,
    hasPending,
    latestTransaction: data || null
  };
}

export async function hasActiveSubscription(db, userId) {
  const status = await getSubscriptionStatus(db, userId);
  return status.isActive;
}
