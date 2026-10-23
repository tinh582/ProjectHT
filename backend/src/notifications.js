export async function dispatchStaffAlert(db, { title, message, channel = 'all', priority = 'normal' }) {
  const timestamp = new Date().toISOString();
  console.log(`[STAFF-ALERT] [${priority}] [${channel}] ${title}: ${message}`);

  if (db) {
    try {
      const { data: staffMembers } = await db.from('profiles').select('id').in('role', ['staff', 'admin']);
      if (staffMembers && staffMembers.length > 0) {
        const rows = staffMembers.map(s => ({
          user_id: s.id,
          title: `[HỆ THỐNG] ${title}`,
          message,
          created_at: timestamp,
        }));
        await db.from('notifications').insert(rows);
      }
    } catch (e) {
      console.warn('Failed to write staff notification row:', e?.message);
    }
  }

  const webhookUrl = process.env.STAFF_WEBHOOK_URL;
  if (webhookUrl && (channel === 'all' || channel === 'webhook')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 <b>${title}</b>\n${message}\n<i>Thời gian: ${timestamp}</i>`,
          parse_mode: 'HTML',
        }),
      });
    } catch (err) {
      console.warn('Staff webhook alert failed to send:', err?.message);
    }
  }

  return { success: true, timestamp };
}