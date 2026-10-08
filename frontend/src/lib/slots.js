const slotCollator = new Intl.Collator('vi', { numeric: true });
export const compareSlots = (a, b) => slotCollator.compare(a.slot_name, b.slot_name);

export function groupSlotsByZone(slots) {
  const grouped = {};
  for (const slot of slots) (grouped[slot.zone_id] ||= []).push(slot);
  for (const zone of Object.values(grouped)) zone.sort(compareSlots);
  return grouped;
}
