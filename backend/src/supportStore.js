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
    zone_name: 'Khu A (Hầm B1)',
    slot_name: 'A-05',
    category: 'GENERAL_FEEDBACK',
    subject: 'Góp ý & Phản hồi tại vị trí Khu A - Ô cố định A-05',
    message: 'Nhờ ban quản lý kiểm tra vệ sinh và vạch kẻ tại Khu A - Chỗ đỗ A-05.',
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'SMS Alert'],
    status: 'resolved',
    staff_reply: 'Ban quản lý đã tiếp nhận phản hồi và cử nhân viên vệ sinh ngay tại Khu A - Ô A-05 cho anh!',
    replies: [
      {
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
    zone_name: 'Khu B (Hầm B1)',
    slot_name: 'B-08',
    category: 'GENERAL_FEEDBACK',
    subject: 'Đánh giá hệ thống thoát nước tại Khu B - Ô đỗ B-08',
    message: 'Hôm qua mưa rất to nhưng vị trí Khu B - Ô đỗ B-08 hoàn toàn khô ráo, cảm ơn đội ngũ kỹ thuật bãi xe!',
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'SMS Alert'],
    status: 'open',
    staff_reply: '',
    replies: [],
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  }
];

// Document store supporting both CCCD & Driver's License (GPLX) across user profiles
export const userDocumentsStore = new Map();

