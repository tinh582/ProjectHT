// Shared store connecting Customer Dashboard <-> Staff Exceptions & Staff Support
export const incidentLogStore = [
  {
    id: 'inc-demo-1',
    user_id: null,
    plate: '30G-688.86',
    slot_name: 'A-05',
    intruder_plate: '30K-112.23',
    incident_type: 'WRONG_SLOT_OCCUPIED',
    severity: 'high',
    title: 'Đỗ lệch / Chiếm ô cố định A-05 (Vi phạm ràng buộc 1 Slot = 1 Xe)',
    description: 'Cảm biến siêu âm & Chủ xe báo: Xe 30K-112.23 đang đỗ lấn vào ô cố định A-05 của xe 30G-688.86.',
    ai_diagnosis:
      'AI Phân tích: Phương tiện 30G-688.86 đã đăng ký cố định tại ô A-05 (1 Slot = 1 Xe). Đề xuất gửi thông báo yêu cầu xe 30K-112.23 di chuyển ngay hoặc điều phối bảo vệ hỗ trợ.',
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
    slot_name: 'A-02',
    intruder_plate: '',
    incident_type: 'AI_PLATE_BLUR',
    severity: 'low',
    title: 'Biển số bị mờ do bùn đất khi trời mưa lớn',
    description: 'Camera cổng ra #02 nhận diện độ tin cậy 78% do biển số sau bị bám bùn.',
    ai_diagnosis:
      'AI Phân tích: Khớp 99.4% đặc trưng mẫu xe Mercedes C300 (Đen) của chủ xe tại ô cố định A-02. Đề xuất mở barie tự động và nhắc vệ sinh biển số.',
    status: 'resolved',
    staff_note: 'Đã đối chiếu camera và mở barie cho khách.',
    reported_by: 'Roboflow AI Gate #02',
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
    slot_name: 'A-05',
    category: 'PAYMENT_QUESTION',
    subject: 'Hỏi về gia hạn ô đỗ cố định A-05 và biên lai VietQR',
    message: 'Mình vừa chuyển khoản gia hạn gói Ô tô tháng, nhờ nhân viên kiểm tra giúp biên lai VietQR.',
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'Telegram/Zalo Bot'],
    status: 'resolved',
    staff_reply: 'Hệ thống AI OCR đã tự động duyệt biên lai và gia hạn ô A-05 thêm 30 ngày cho anh!',
    replies: [
      {
        sender: 'staff',
        author: 'Nhân viên trực ban',
        text: 'Hệ thống AI OCR đã tự động duyệt biên lai và gia hạn ô A-05 thêm 30 ngày cho anh!',
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
    slot_name: 'A-08',
    category: 'GENERAL_FEEDBACK',
    subject: 'Đánh giá hệ thống thoát nước hầm B1 khi mưa lớn',
    message: 'Hôm qua mưa rất to nhưng hầm B1 khu A hoàn toàn khô ráo, cảm ơn đội ngũ kỹ thuật bãi xe!',
    notified_channels: ['Dashboard Realtime Bell', 'Email SMTP', 'SMS Alert'],
    status: 'open',
    staff_reply: '',
    replies: [],
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  }
];

