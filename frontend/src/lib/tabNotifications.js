/**
 * Utility for classifying notifications into specific navigation tabs and computing
 * red circular badge counts (.nav-tab-badge) across User, Staff, and Admin portals.
 */

export function classifyUserNotificationTab(notif) {
  const text = `${notif?.title || ''} ${notif?.message || ''}`.toLowerCase();
  if (
    text.includes('phản hồi') ||
    text.includes('góp ý') ||
    text.includes('hỗ trợ') ||
    text.includes('chiếm') ||
    text.includes('sự cố') ||
    text.includes('nhân viên') ||
    text.includes('xử lý')
  ) {
    return 'support';
  }
  if (
    text.includes('thanh toán') ||
    text.includes('gói') ||
    text.includes('biên lai') ||
    text.includes('gia hạn') ||
    text.includes('kích hoạt') ||
    text.includes('hóa đơn') ||
    text.includes('duyệt')
  ) {
    return 'payment';
  }
  if (
    text.includes('vào bãi') ||
    text.includes('ra bãi') ||
    text.includes('lịch sử') ||
    text.includes('barie') ||
    text.includes('phiên đỗ')
  ) {
    return 'history';
  }
  return 'vehicles';
}

export function computeUserTabBadges({
  notifications = [],
  supportTickets = [],
  seenNotifIds = new Set(),
  seenTicketReplies = new Set()
}) {
  const counts = {
    vehicles: 0,
    history: 0,
    payment: 0,
    support: 0
  };

  for (const n of notifications) {
    if (n?.is_read || seenNotifIds.has(n?.id)) continue;
    const tab = classifyUserNotificationTab(n);
    counts[tab] = (counts[tab] || 0) + 1;
  }

  // Also count support tickets that received a staff reply not yet seen
  for (const t of supportTickets) {
    const hasStaffReply =
      Boolean(t?.replied_at || t?.staff_reply) ||
      (Array.isArray(t?.replies) && t.replies.some((r) => r.sender_role === 'staff'));
    const replyKey = `${t?.id}_${t?.replied_at || t?.replies?.length || 0}`;
    if (hasStaffReply && !seenTicketReplies.has(replyKey)) {
      counts.support += 1;
    }
  }

  return counts;
}

export function classifyStaffNotificationTab(notif) {
  const text = `${notif?.title || ''} ${notif?.message || ''}`.toLowerCase();
  if (text.includes('camera') || text.includes('nhận diện') || text.includes('biển số mờ')) {
    return 'camera';
  }
  if (text.includes('sơ đồ') || text.includes('khu vực') || text.includes('bảo trì')) {
    return 'map';
  }
  if (
    text.includes('lỗi') ||
    text.includes('sự cố') ||
    text.includes('ngoại lệ') ||
    text.includes('chiếm') ||
    text.includes('đỗ sai') ||
    text.includes('barie') ||
    text.includes('quá hạn')
  ) {
    return 'exception';
  }
  if (text.includes('check') || text.includes('ra/vào') || text.includes('vào bãi') || text.includes('ra bãi')) {
    return 'checkin';
  }
  return 'support';
}

export function computeStaffTabBadges({
  notifications = [],
  pendingTxCount = 0,
  openFeedbackCount = 0,
  openIncidentCount = 0,
  maintenanceSlotCount = 0,
  seenNotifIds = new Set()
}) {
  const counts = {
    camera: 0,
    map: maintenanceSlotCount,
    exception: openIncidentCount,
    support: pendingTxCount + openFeedbackCount,
    checkin: 0
  };

  for (const n of notifications) {
    if (n?.is_read || seenNotifIds.has(n?.id)) continue;
    const tab = classifyStaffNotificationTab(n);
    // Avoid double-counting if support/exception already reflects live pending items, unless counts[tab] is 0
    if ((tab === 'support' || tab === 'exception') && counts[tab] > 0) {
      continue;
    }
    counts[tab] = (counts[tab] || 0) + 1;
  }

  return counts;
}

export function classifyAdminNotificationTab(notif) {
  const text = `${notif?.title || ''} ${notif?.message || ''}`.toLowerCase();
  if (text.includes('khu vực') || text.includes('bãi đỗ') || text.includes('sơ đồ') || text.includes('bảo trì')) {
    return 'map';
  }
  if (text.includes('giá') || text.includes('gói cước') || text.includes('ưu đãi')) {
    return 'pricing';
  }
  if (text.includes('báo cáo') || text.includes('thống kê') || text.includes('doanh thu') || text.includes('biên lai') || text.includes('thanh toán')) {
    return 'reports';
  }
  return 'users';
}

export function computeAdminTabBadges({
  notifications = [],
  pendingKycCount = 0,
  pendingStaffConfirmCount = 0,
  maintenanceSlotCount = 0,
  pendingTxCount = 0,
  seenNotifIds = new Set()
}) {
  const counts = {
    map: maintenanceSlotCount,
    users: pendingKycCount + pendingStaffConfirmCount,
    pricing: 0,
    reports: pendingTxCount
  };

  for (const n of notifications) {
    if (n?.is_read || seenNotifIds.has(n?.id)) continue;
    const tab = classifyAdminNotificationTab(n);
    if (counts[tab] === 0) {
      counts[tab] += 1;
    }
  }

  return counts;
}

