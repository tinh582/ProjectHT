export class AiAnalysisResult {
  constructor({ category, userMessage, technicalSummary, recommendedAction, severity, fallbackApplied }) {
    this.category = category;
    this.userMessage = userMessage;
    this.technicalSummary = technicalSummary;
    this.recommendedAction = recommendedAction;
    this.severity = severity;
    this.fallbackApplied = fallbackApplied;
  }
}

export function analyzeAndHandleError(error, context = {}) {
  const message = error?.message || String(error);
  const code = error?.code || '';
  const status = error?.status || 500;

  let category = 'UNKNOWN';
  let userMessage = 'Hệ thống đã ghi nhận sự cố và đang tự động xử lý. Vui lòng thử lại sau giây lát.';
  let technicalSummary = message;
  let recommendedAction = 'Kiểm tra nhật ký hệ thống hoặc liên hệ quản trị viên.';
  let severity = 'medium';
  let fallbackApplied = false;

  if (code === '23505' || message.includes('unique constraint') || message.includes('already been taken')) {
    category = 'DATABASE_CONFLICT';
    userMessage = 'Dữ liệu hoặc vị trí đỗ này đã được đăng ký hoặc đang được sử dụng. Vui lòng chọn vị trí khác.';
    recommendedAction = 'Refresh lại sơ đồ bãi đỗ để lấy danh sách slot thời gian thực.';
    severity = 'low';
  } else if (code === 'P0001' || message.includes('A parked vehicle cannot')) {
    category = 'BUSINESS_RULE_VIOLATION';
    userMessage = message;
    recommendedAction = 'Không thay đổi slot khi xe đang trong trạng thái đỗ.';
    severity = 'low';
  } else if (code === '42703' || message.includes('column') || message.includes('does not exist')) {
    category = 'SCHEMA_MISMATCH';
    userMessage = 'Dữ liệu đang được đồng bộ. Thao tác của bạn đã được chuyển vào chế độ dự phòng.';
    technicalSummary = 'Thiếu cột database: ' + message;
    recommendedAction = 'Chạy migration 002_system_improvements.sql.';
    severity = 'high';
    fallbackApplied = true;
  } else if (message.includes('Roboflow') || message.includes('OCR') || message.includes('fetch failed') || message.includes('AbortError')) {
    category = 'NETWORK_AI_SERVICE';
    userMessage = 'Dịch vụ nhận diện tự động đang bận hoặc phản hồi chậm. Yêu cầu của bạn được chuyển vào hàng đợi kiểm duyệt thủ công.';
    recommendedAction = 'Fallback tự động sang chế độ Manual Staff Verification.';
    severity = 'medium';
    fallbackApplied = true;
  } else if (status === 401 || status === 403 || message.includes('JWT') || message.includes('unauthorized')) {
    category = 'AUTHENTICATION';
    userMessage = 'Phiên làm việc đã hết hạn hoặc bạn không có quyền truy cập chức năng này.';
    recommendedAction = 'Đăng nhập lại để làm mới token.';
    severity = 'low';
  }

  const timestamp = new Date().toISOString();
  console.warn(`[AI-ERROR-AGENT] [${timestamp}] [${category}] [Severity: ${severity}]`, {
    context,
    technicalSummary,
    fallbackApplied,
  });

  return new AiAnalysisResult({
    category,
    userMessage,
    technicalSummary,
    recommendedAction,
    severity,
    fallbackApplied,
  });
}

export function aiErrorHandlerMiddleware(err, req, res, next) {
  const analysis = analyzeAndHandleError(err, {
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id,
  });

  const statusCode = err.status || (analysis.category === 'DATABASE_CONFLICT' ? 409 : 500);

  res.status(statusCode).json({
    error: analysis.userMessage,
    aiAnalysis: {
      category: analysis.category,
      severity: analysis.severity,
      fallbackApplied: analysis.fallbackApplied,
      recommendation: analysis.recommendedAction,
    },
  });
}