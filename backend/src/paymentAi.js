export function verifyPaymentReceipt(ocrTextOrBase64, expectedAmount, expectedUserId) {
  if (!ocrTextOrBase64) {
    return {
      autoApproved: false,
      confidence: 0,
      reason: 'Không có dữ liệu ảnh hoá đơn.',
      extractedData: null,
    };
  }

  const text = typeof ocrTextOrBase64 === 'string' ? ocrTextOrBase64 : '';

  const numberMatches = text.match(/\b\d{1,3}(?:[.,]\d{3})*(?:\s*(?:VND|đ|d|dong))?\b/gi) || [];
  const parsedAmounts = numberMatches.map(m => {
    const clean = m.replace(/[^\d]/g, '');
    return parseInt(clean, 10);
  }).filter(n => !isNaN(n) && n >= 10000);

  const matchedAmount = parsedAmounts.find(amt => amt === Number(expectedAmount));
  const hasUserCode = expectedUserId ? text.toLowerCase().includes(expectedUserId.slice(0, 8).toLowerCase()) : false;

  let confidence = 0.2;
  if (matchedAmount) confidence += 0.5;
  if (hasUserCode) confidence += 0.3;

  const isAutoApproved = Boolean(matchedAmount && hasUserCode && confidence >= 0.8);

  return {
    autoApproved: isAutoApproved,
    confidence: Math.round(confidence * 100),
    matchedAmount: matchedAmount || null,
    hasUserCode,
    extractedAmounts: parsedAmounts.slice(0, 5),
    reason: isAutoApproved 
      ? 'Khớp số tiền và nội dung mã giao dịch hợp lệ (Duyệt tự động bởi AI).' 
      : (matchedAmount ? 'Khớp số tiền nhưng cần nhân viên xác nhận nội dung chuyển khoản.' : 'Cần nhân viên đối soát số tiền hoặc mã giao dịch.'),
  };
}