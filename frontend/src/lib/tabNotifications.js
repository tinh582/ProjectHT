/**
 * Utility for classifying notifications into specific navigation tabs and computing
 * red circular badge counts (.nav-tab-badge) across User, Staff, and Admin portals.
 * Persists seen notification IDs in localStorage and syncs with backend `is_read`
 * so badge numbers never stay fixed or reappear after refreshing the page.
 */

export function loadSeenSet(storageKey) {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSeenSet(storageKey, set) {
  try {
    if (typeof localStorage === 'undefined') return;
    const arr = Array.from(set).map(String).slice(-500);
    localStorage.setItem(storageKey, JSON.stringify(arr));
  } catch {
    // Ignore storage quota errors
  }
}

export function getTicketReplyKey(ticket) {
  if (!ticket?.id) return '';
  return `${ticket.id}_${ticket.replied_at || ticket.replies?.length || 0}`;
}

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
    if (!n?.id || n?.is_read || seenNotifIds.has(String(n.id))) continue;
    const tab = classifyUserNotificationTab(n);
    counts[tab] = (counts[tab] || 0) + 1;
  }

  // Only count real user support tickets (not demo seed tickets with user_id === null)
  // that received a staff reply not yet seen by the user.
  for (const t of supportTickets) {
    if (!t?.id || t?.user_id === null || t?.is_demo) continue;
    const hasStaffReply =
      Boolean(t?.replied_at || t?.staff_reply) ||
      (Array.isArray(t?.replies) && t.replies.some((r) => r.sender === 'staff' || r.sender_role === 'staff'));
    const replyKey = getTicketReplyKey(t);
    if (hasStaffReply && replyKey && !seenTicketReplies.has(replyKey)) {
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
  seenNotifIds = new Set()
}) {
  const counts = {
    camera: 0,
    map: 0,
    exception: 0,
    support: 0,
    checkin: 0
  };

  for (const n of notifications) {
    if (!n?.id || n?.is_read || seenNotifIds.has(String(n.id))) continue;
    const tab = classifyStaffNotificationTab(n);
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
  seenNotifIds = new Set()
}) {
  const counts = {
    map: 0,
    users: 0,
    pricing: 0,
    reports: 0
  };

  for (const n of notifications) {
    if (!n?.id || n?.is_read || seenNotifIds.has(String(n.id))) continue;
    const tab = classifyAdminNotificationTab(n);
    counts[tab] = (counts[tab] || 0) + 1;
  }

  return counts;
}


