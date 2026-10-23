export async function purgeSensitiveUserData(db, userId, reason = 'USER_TERMINATION') {
  if (!db || !userId) throw new Error('Invalid userId for zero-data purge.');

  const timestamp = new Date().toISOString();
  console.log(`[PRIVACY-ENGINE] Initiating Zero-Data Retention purge for user: ${userId}. Reason: ${reason}`);

  const { data: vehicles } = await db.from('vehicles').select('id').eq('user_id', userId);
  const vehicleIds = (vehicles || []).map(v => v.id);

  if (vehicleIds.length > 0) {
    await db.from('parking_slots').update({ vehicle_id: null, status: 'empty' }).in('vehicle_id', vehicleIds);
    await db.from('parking_sessions').delete().in('vehicle_id', vehicleIds);
    await db.from('vehicles').delete().eq('user_id', userId);
  }

  await db.from('transactions')
    .update({
      payment_proof: null,
      ai_ocr_result: null,
    })
    .eq('user_id', userId);

  await db.from('notifications').delete().eq('user_id', userId);

  const { error: profileError } = await db.from('profiles').update({
    phone: null,
    address: null,
    id_card_front: null,
    id_card_back: null,
    kyc_status: 'purged',
    name: 'Anonymous User',
  }).eq('id', userId);

  if (profileError) throw profileError;

  return {
    success: true,
    purgedAt: timestamp,
    status: 'ZERO_DATA_APPLIED',
  };
}