// Helper to generate realistic Vietnamese Citizen ID Card (CCCD gắn chip) Front & Back sample images + sample profile info

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSampleCccdFront({
  name = 'NGUYỄN MINH TUẤN',
  cccdNo = '001095012345',
  dob = '15/08/1995',
  sex = 'Nam',
  origin = 'Phường Điện Biên, Quận Ba Đình, TP. Hà Nội',
  address = 'Căn hộ 1205, Tòa HT Tower, Quận 1, TP. Hồ Chí Minh',
  expiry = '15/08/2035'
} = {}) {
  const safeName = escapeXml(String(name || 'NGUYỄN MINH TUẤN').toUpperCase());
  const safeCccd = escapeXml(cccdNo);
  const safeDob = escapeXml(dob);
  const safeSex = escapeXml(sex);
  const safeOrigin = escapeXml(origin);
  const safeAddress = escapeXml(address);
  const safeExpiry = escapeXml(expiry);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bgFront" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0f9ff" />
      <stop offset="50%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#f0fdf4" />
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="632" height="392" rx="22" fill="url(#bgFront)" stroke="#94a3b8" stroke-width="3" />
  <circle cx="320" cy="220" r="130" fill="none" stroke="#bae6fd" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7" />
  <circle cx="72" cy="58" r="28" fill="#dc2626" stroke="#f59e0b" stroke-width="3" />
  <polygon points="72,38 77,52 92,52 80,60 84,74 72,66 60,74 64,60 52,52 67,52" fill="#facc15" />
  <text x="330" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</text>
  <text x="330" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155">Độc lập - Tự do - Hạnh phúc</text>
  <text x="330" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748b">SOCIALIST REPUBLIC OF VIET NAM</text>
  <text x="330" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#dc2626">CĂN CƯỚC CÔNG DÂN</text>
  <text x="330" y="124" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#dc2626">CITIZEN IDENTITY CARD</text>
  <rect x="536" y="28" width="72" height="72" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <rect x="544" y="36" width="18" height="18" fill="#0f172a" />
  <rect x="582" y="36" width="18" height="18" fill="#0f172a" />
  <rect x="544" y="74" width="18" height="18" fill="#0f172a" />
  <rect x="566" y="56" width="14" height="14" fill="#0f172a" />
  <rect x="584" y="76" width="14" height="14" fill="#0f172a" />
  <rect x="34" y="132" width="135" height="175" rx="8" fill="#ffffff" stroke="#64748b" stroke-width="1.5" />
  <circle cx="101" cy="192" r="30" fill="#94a3b8" />
  <path d="M55,295 C55,248 147,248 147,295 Z" fill="#64748b" />
  <text x="101" y="328" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#475569">Có giá trị đến / Expiry</text>
  <text x="101" y="344" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${safeExpiry}</text>
  <text x="192" y="152" font-family="Arial, sans-serif" font-size="12" fill="#334155">Số / No.:</text>
  <text x="260" y="154" font-family="Courier New, monospace" font-size="22" font-weight="bold" fill="#dc2626" letter-spacing="2">${safeCccd}</text>
  <text x="192" y="180" font-family="Arial, sans-serif" font-size="11" fill="#475569">Họ và tên / Full name:</text>
  <text x="192" y="202" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">${safeName}</text>
  <text x="192" y="228" font-family="Arial, sans-serif" font-size="11" fill="#475569">Ngày sinh / DOB: <tspan font-weight="bold" fill="#0f172a">${safeDob}</tspan></text>
  <text x="415" y="228" font-family="Arial, sans-serif" font-size="11" fill="#475569">Giới tính / Sex: <tspan font-weight="bold" fill="#0f172a">${safeSex}</tspan></text>
  <text x="192" y="254" font-family="Arial, sans-serif" font-size="11" fill="#475569">Quốc tịch / Nationality: <tspan font-weight="bold" fill="#0f172a">Việt Nam</tspan></text>
  <text x="192" y="280" font-family="Arial, sans-serif" font-size="11" fill="#475569">Quê quán / Place of origin:</text>
  <text x="192" y="298" font-family="Arial, sans-serif" font-size="12.5" font-weight="bold" fill="#0f172a">${safeOrigin}</text>
  <text x="192" y="324" font-family="Arial, sans-serif" font-size="11" fill="#475569">Nơi thường trú / Place of residence:</text>
  <text x="192" y="342" font-family="Arial, sans-serif" font-size="12.5" font-weight="bold" fill="#0f172a">${safeAddress}</text>
  <rect x="470" y="352" width="142" height="24" rx="12" fill="#059669" />
  <text x="541" y="368" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">CCCD MẶT TRƯỚC</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildSampleCccdBack({
  name = 'NGUYEN MINH TUAN',
  cccdNo = '001095012345',
  issueDate = '20/10/2022',
  feature = 'Nốt ruồi C: 1cm dưới đuôi mắt phải'
} = {}) {
  const rawMrzName = String(name || 'NGUYEN MINH TUAN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'D')
    .replace(/[^A-Z0-9\s]/gi, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '<<')
    .padEnd(28, '<')
    .slice(0, 28);

  const safeMrzName = escapeXml(rawMrzName);
  const safeCccd = escapeXml(cccdNo);
  const safeIssueDate = escapeXml(issueDate);
  const safeFeature = escapeXml(feature);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bgBack" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="50%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#f0fdf4" />
    </linearGradient>
    <linearGradient id="chipGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="632" height="392" rx="22" fill="url(#bgBack)" stroke="#94a3b8" stroke-width="3" />
  <text x="36" y="40" font-family="Arial, sans-serif" font-size="11" fill="#475569">Đặc điểm nhận dạng / Personal identification:</text>
  <text x="36" y="60" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${safeFeature}</text>
  <rect x="46" y="96" width="84" height="68" rx="10" fill="url(#chipGold)" stroke="#92400e" stroke-width="1.5" />
  <line x1="46" y1="118" x2="130" y2="118" stroke="#92400e" stroke-width="1.2" />
  <line x1="46" y1="142" x2="130" y2="142" stroke="#92400e" stroke-width="1.2" />
  <line x1="74" y1="96" x2="74" y2="164" stroke="#92400e" stroke-width="1.2" />
  <line x1="102" y1="96" x2="102" y2="164" stroke="#92400e" stroke-width="1.2" />
  <rect x="160" y="84" width="110" height="125" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
  <ellipse cx="215" cy="140" rx="28" ry="38" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,2" />
  <ellipse cx="215" cy="140" rx="18" ry="26" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,2" />
  <text x="215" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#475569">Ngón trỏ trái</text>
  <rect x="284" y="84" width="110" height="125" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
  <ellipse cx="339" cy="140" rx="28" ry="38" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,2" />
  <ellipse cx="339" cy="140" rx="18" ry="26" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,2" />
  <text x="339" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#475569">Ngón trỏ phải</text>
  <text x="505" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">Ngày cấp / Date of issue:</text>
  <text x="505" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${safeIssueDate}</text>
  <text x="505" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#334155">CỤC TRƯỞNG CỤC CẢNH SÁT</text>
  <text x="505" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#334155">QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI</text>
  <circle cx="485" cy="160" r="36" fill="none" stroke="#dc2626" stroke-width="2" opacity="0.75" />
  <text x="485" y="164" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#dc2626" opacity="0.85">ĐÃ ĐỐI CHIẾU</text>
  <rect x="24" y="248" width="592" height="122" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="44" y="282" font-family="Courier New, monospace" font-size="20" font-weight="bold" fill="#0f172a" letter-spacing="2.5">IDVNM0950123451${safeCccd}&lt;&lt;8</text>
  <text x="44" y="316" font-family="Courier New, monospace" font-size="20" font-weight="bold" fill="#0f172a" letter-spacing="2.5">9508155M3508152VNM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;6</text>
  <text x="44" y="350" font-family="Courier New, monospace" font-size="20" font-weight="bold" fill="#0f172a" letter-spacing="2.5">${safeMrzName}</text>
  <rect x="470" y="216" width="142" height="24" rx="12" fill="#2563eb" />
  <text x="541" y="232" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">CCCD MẶT SAU</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_KYC_PROFILES = [
  {
    label: 'Mẫu 1: Nguyễn Minh Tuấn (Chủ xe Ô tô Mazda CX-5)',
    name: 'Nguyễn Minh Tuấn',
    email: 'minhtuan.nguyen@htparking.vn',
    phone: '0901234567',
    address: 'Căn hộ 1205, Tòa HT Tower, Quận 1, TP. Hồ Chí Minh',
    cccdNo: '001095012345',
    dob: '15/08/1995',
    sex: 'Nam',
    origin: 'Phường Điện Biên, Quận Ba Đình, TP. Hà Nội',
    feature: 'Nốt ruồi C: 1cm dưới đuôi mắt phải'
  },
  {
    label: 'Mẫu 2: Trần Thanh Hương (Chủ xe Ô tô Mercedes C300)',
    name: 'Trần Thanh Hương',
    email: 'thanhhuong.tran@htparking.vn',
    phone: '0918886688',
    address: 'Biệt thự B08, Khu đô thị Sala, TP. Thủ Đức, TP. Hồ Chí Minh',
    cccdNo: '079196088688',
    dob: '22/11/1996',
    sex: 'Nữ',
    origin: 'Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    feature: 'Nốt ruồi C: 0.5cm trên cánh mũi trái'
  },
  {
    label: 'Mẫu 3: Lê Hoàng Nam (Chủ xe Ô tô VinFast VF8)',
    name: 'Lê Hoàng Nam',
    email: 'hoangnam.le@htparking.vn',
    phone: '0989777999',
    address: 'Căn hộ P-2402, Tháp Đông HT Tower, Quận Cầu Giấy, TP. Hà Nội',
    cccdNo: '001092068886',
    dob: '10/03/1992',
    sex: 'Nam',
    origin: 'Phường Dịch Vọng, Quận Cầu Giấy, TP. Hà Nội',
    feature: 'Sẹo chấm C: 1cm trên lông mày phải'
  }
];
