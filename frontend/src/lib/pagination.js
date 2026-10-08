// Support both the original array response and the paginated API during upgrades.
export function readPage(data, page, pageSize) {
  if (Array.isArray(data)) {
    return { items: data.slice((page - 1) * pageSize, page * pageSize), total: data.length };
  }
  if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0) {
    throw new Error('Dữ liệu danh sách không hợp lệ. Vui lòng khởi động lại backend và thử lại.');
  }
  return { items: data.items, total: data.total };
}
