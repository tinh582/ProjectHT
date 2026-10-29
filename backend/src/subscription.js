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
    const res = await db.from('transactions')
      .select('id, plan_name, amount, created_at, confirmed_at, cycle_start, cycle_end, verified_by, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    data = res.data;
    error = res.error;
  } catch (e) {
    error = e;
  }

  if (error && error.code === '42703') {
    try {
      const fallback = await db.from('transactions')
        .select('id, plan_name, amount, created_at, status')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fallback.data;
    } catch (_) {}
  }

  let hasPending = false;
  try {
    const { data: pendingData } = await db.from('transactions')
      .select('id, plan_name, amount, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
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
    latestTransaction: data || null,
  };
}

export async function hasActiveSubscription(db, userId) {
  const status = await getSubscriptionStatus(db, userId);
  return status.isActive;
}
