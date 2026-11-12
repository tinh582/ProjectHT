// Shared store connecting Customer Dashboard <-> Staff Exceptions & Staff Support
export const incidentLogStore = [
  {
    id: 'inc-demo-1',
    user_id: null,
    plate: '30G-688.86',
    zone_name: 'Khu A (Ô tô)',
    slot_name: 'A-05',
    intruder_plate: '30K-112.23',
    incident_type: 'WRONG_SLOT_OCCUPIED',
    severity: 'high',
    title: 'Đỗ lệch / Chiếm ô cố định A-05 tại Khu A (Vi phạm 1 Slot = 1 Xe)',
    description: 'Cảm biến siêu âm & Chủ xe báo: Xe 30K-112.23 đang đỗ lấn vào ô cố định A-05 (Khu A) của xe 30G-688.86.',
    ai_diagnosis:
      'AI Phân tích: Phương tiện 30G-688.86 đã đăng ký cố định tại Khu A - Ô A-05 (1 Slot = 1 Xe). Đề xuất gửi thông báo yêu cầu xe 30K-112.23 di chuyển ngay hoặc điều phối bảo vệ hỗ trợ.',
    status: 'open',
    staff_note: '',
    reported_by: 'AI Sensor & Chủ xe 30G-688.86',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    resolved_at: null
  },
  {
    id: 'inc-demo-2',
    user_id: null,
    plate: '29A-999.99',
    zone_name: 'Khu A (Ô tô)',
    slot_name: 'A-02',
    intruder_plate: '',
    incident_type: 'AI_PLATE_BLUR',
    severity: 'low',
    title: 'Đối chiếu thủ công Giấy phép lái xe (GPLX) khi biển số bị mờ do mưa',
    description: 'Camera cổng ra #02 nhận diện độ tin cậy 78% do biển số sau bị bám bùn. Nhân viên đã chụp Giấy phép lái xe Hạng B2 để đối chiếu thủ công.',
    ai_diagnosis:
      'Đối chiếu thủ công GPLX: Khớp 100% thông tin chủ xe Mercedes C300 (Đen) tại Khu A - Ô cố định A-02. Đã mở barie an toàn.',
    status: 'resolved',
    staff_note: 'Đã chụp Giấy phép lái xe đối chiếu thủ công và mở barie cho khách.',
    reported_by: 'Trực ban Cổng #02 (Đối chiếu GPLX)',
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 175 * 60 * 1000).toISOString()
  }
];

export const feedbackStore = [
  {
    id: 'fb-101',
    user_id: null,
    customer_name: 'Nguyễn Minh Tuấn',
    customer_email: 'minhtuan.nguyen@htparking.vn',
    plate: '30G-688.86',
    vehicle_info: 'Mercedes C300 (Ô tô)',
    zone_name: 'Khu A (Hầm B1)',
    slot_name: 'A-05',
    category: 'GENERAL_FEEDBACK',
    subject: 'Góp ý & Phản hồi tại vị trí Khu A - Ô cố định A-05',
    message: 'Nhờ ban quản lý kiểm tra vệ sinh và vạch kẻ tại Khu A - Chỗ đỗ A-05.',
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'SMS Alert'],
    status: 'resolved',
    is_fixed: true,
    staff_reply: 'Ban quản lý đã tiếp nhận phản hồi và cử nhân viên vệ sinh ngay tại Khu A - Ô A-05 cho anh!',
    replied_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    replies: [
      {
        id: 'rep-101-1',
        sender: 'customer',
        author: 'Nguyễn Minh Tuấn',
        text: 'Nhờ ban quản lý kiểm tra vệ sinh và vạch kẻ tại Khu A - Chỗ đỗ A-05.',
        created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
      },
      {
        id: 'rep-101-2',
        sender: 'staff',
        author: 'Nhân viên trực ban',
        text: 'Ban quản lý đã tiếp nhận phản hồi và cử nhân viên vệ sinh ngay tại Khu A - Ô A-05 cho anh!',
        created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  },
  {
    id: 'fb-102',
    user_id: null,
    customer_name: 'Trần Thanh Hương',
    customer_email: 'thanhhuong.tran@htparking.vn',
    plate: '30E-456.78',
    vehicle_info: 'Honda CR-V (Ô tô)',
    zone_name: 'Khu B (Hầm B1)',
    slot_name: 'B-08',
    category: 'GENERAL_FEEDBACK',
    subject: 'Đánh giá hệ thống thoát nước tại Khu B - Ô đỗ B-08',
    message: 'Hôm qua mưa rất to nhưng vị trí Khu B - Ô đỗ B-08 hoàn toàn khô ráo, cảm ơn đội ngũ kỹ thuật bãi xe!',
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'SMS Alert'],
    status: 'open',
    is_fixed: true,
    staff_reply: '',
    replied_at: null,
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    replies: [
      {
        id: 'rep-102-1',
        sender: 'customer',
        author: 'Trần Thanh Hương',
        text: 'Hôm qua mưa rất to nhưng vị trí Khu B - Ô đỗ B-08 hoàn toàn khô ráo, cảm ơn đội ngũ kỹ thuật bãi xe!',
        created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  }
];

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_CACHE_FILE = path.resolve(__dirname, '../.kyc_documents_store.json');

function loadPersistedDocsMap() {
  try {
    if (fs.existsSync(DOCS_CACHE_FILE)) {
      const raw = fs.readFileSync(DOCS_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return new Map(Object.entries(parsed));
      }
    }
  } catch {
    // Ignore corrupt or missing cache file
  }
  return new Map();
}

function savePersistedDocsMap(map) {
  try {
    const obj = Object.fromEntries(map.entries());
    fs.writeFileSync(DOCS_CACHE_FILE, JSON.stringify(obj), 'utf8');
  } catch {
    // Ignore write failure in read-only environments
  }
}

class PersistentDocsMap extends Map {
  constructor() {
    super(loadPersistedDocsMap());
  }
  set(key, val) {
    super.set(String(key), val);
    savePersistedDocsMap(this);
    return this;
  }
  get(key) {
    return super.get(String(key));
  }
  delete(key) {
    const res = super.delete(String(key));
    savePersistedDocsMap(this);
    return res;
  }
}

// Document store supporting both CCCD & Driver's License (GPLX) across user profiles,
// persisted to disk so node --watch restarts never lose uploaded GPLX images.
export const userDocumentsStore = new PersistentDocsMap();

/**
 * Packs CCCD + GPLX into existing id_card_front / id_card_back TEXT columns
 * when the Supabase profiles table does not yet have separate driver_license_front / driver_license_back columns.
 */
export function packKycColumnsForDb({
  id_card_front,
  id_card_back,
  driver_license_front,
  driver_license_back
} = {}) {
  const packSide = (cccdVal, gplxVal) => {
    if (gplxVal) {
      return JSON.stringify({
        __ht_kyc_v1: true,
        cccd: cccdVal || null,
        gplx: gplxVal || null
      });
    }
    return cccdVal ?? null;
  };
  return {
    id_card_front: packSide(id_card_front, driver_license_front),
    id_card_back: packSide(id_card_back, driver_license_back)
  };
}

function unpackSideValue(rawVal) {
  if (typeof rawVal === 'string' && rawVal.startsWith('{"__ht_kyc_v1":true')) {
    try {
      const parsed = JSON.parse(rawVal);
      if (parsed && parsed.__ht_kyc_v1) {
        return {
          cccd: parsed.cccd || null,
          gplx: parsed.gplx || null,
          wasPacked: true
        };
      }
    } catch {
      // Treat as raw image string
    }
  }
  return {
    cccd: rawVal || null,
    gplx: null,
    wasPacked: false
  };
}

/**
 * Restores id_card_front, id_card_back, driver_license_front, driver_license_back
 * from either dedicated DB columns, packed id_card_front/back JSON bundles, or persistent userDocumentsStore.
 */
export function unpackKycProfile(row = {}, userId = null) {
  if (!row || typeof row !== 'object') return row;
  const uid = String(userId || row.id || '');
  const extraDocs = (uid && userDocumentsStore.get(uid)) || {};

  const frontUnpacked = unpackSideValue(row.id_card_front);
  const backUnpacked = unpackSideValue(row.id_card_back);

  const id_card_front =
    frontUnpacked.cccd !== null
      ? frontUnpacked.cccd
      : extraDocs.id_card_front !== undefined
      ? extraDocs.id_card_front
      : null;

  const id_card_back =
    backUnpacked.cccd !== null
      ? backUnpacked.cccd
      : extraDocs.id_card_back !== undefined
      ? extraDocs.id_card_back
      : null;

  const driver_license_front =
    row.driver_license_front ||
    frontUnpacked.gplx ||
    extraDocs.driver_license_front ||
    null;

  const driver_license_back =
    row.driver_license_back ||
    backUnpacked.gplx ||
    extraDocs.driver_license_back ||
    null;

  return {
    ...row,
    id_card_front,
    id_card_back,
    driver_license_front,
    driver_license_back
  };
}


