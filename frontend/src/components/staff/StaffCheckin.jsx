import { apiFetch } from '../../lib/api';
import React, { useState } from 'react';

export default function StaffCheckin() {
  const [activeMode, setActiveMode] = useState('image'); // 'image' or 'plate'
  const [plateInput, setPlateInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [logMessage, setLogMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // { type: 'success' | 'error', text: string }

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2000000 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Vui lòng chọn file ảnh (PNG, JPEG, WebP, GIF) có kích thước dưới 2MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setImagePreview(base64Data);
      setLogMessage('');
      setScanStatus(null);
      setIsScanning(true);

      try {
        const response = await apiFetch('/api/components/staff/StaffCheckin/extract-plate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data })
        });
        const data = await response.json();
        if (response.ok && data.success && data.plate) {
          setPlateInput(data.plate);
          setScanStatus({
            type: 'success',
            text: `Đã nhận diện thành công biển số: ${data.plate}`
          });
        } else {
          setScanStatus({
            type: 'error',
            text: data.error || 'Không nhận diện được biển số từ ảnh. Vui lòng thử ảnh khác hoặc nhập thủ công.'
          });
        }
      } catch (err) {
        setScanStatus({
          type: 'error',
          text: 'Lỗi nhận diện: ' + err.message
        });
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!plateInput || isProcessing || isScanning) return;
    setIsProcessing(true);
    setLogMessage('');

    try {
      const response = await apiFetch('/api/components/staff/StaffCheckin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plateInput })
      });
      const data = await response.json();
      if (response.ok) {
        setLogMessage(data.logMessage || 'Thao tác thành công.');
        setPlateInput('');
        setImagePreview(null);
        setScanStatus(null);
      } else {
        setLogMessage('❌ ' + (data.error || 'Không thể cập nhật phiên đỗ xe.'));
      }
    } catch (error) {
      setLogMessage('❌ Lỗi kết nối đến server: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BARRIER TERMINAL</p>
          <h1>Check in / Check out<span>.</span></h1>
        </div>
      </div>

      <div className="checkin-panel panel">
        <p className="staff-description">
          Nhân viên có thể tải ảnh chụp xe tại barie để AI tự động nhận diện biển số và thực hiện check-in hoặc check-out, hoặc nhập biển số trực tiếp.
        </p>

        {/* Tab switch between Image Upload and Manual text */}
        <div className="checkin-mode-tabs">
          <button
            type="button"
            className={`checkin-mode-btn ${activeMode === 'image' ? 'active' : ''}`}
            onClick={() => setActiveMode('image')}
          >
            📸 Check-in/out bằng hình ảnh
          </button>
          <button
            type="button"
            className={`checkin-mode-btn ${activeMode === 'plate' ? 'active' : ''}`}
            onClick={() => setActiveMode('plate')}
          >
            ⌨️ Nhập biển số thủ công
          </button>
        </div>

        <form onSubmit={handleCheckInSubmit} className="staff-checkin-form">
          {activeMode === 'image' && (
            <div className="checkin-image-section">
              <label className="checkin-upload-dropzone">
                <span className="checkin-upload-icon">📷</span>
                <span className="checkin-upload-title">Tải lên hình ảnh xe tại barie</span>
                <span className="checkin-upload-subtitle">Hệ thống AI sẽ quét và tự động trích xuất biển số xe</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={isProcessing || isScanning}
                  style={{ display: 'none' }}
                />
              </label>

              {isScanning && (
                <div className="plate-scan-status scanning" style={{ marginTop: '12px' }}>
                  <span className="spinner-dot">⏳</span> Đang phân tích ảnh và trích xuất biển số xe qua Roboflow AI...
                </div>
              )}

              {scanStatus && (
                <div className={`plate-scan-status ${scanStatus.type}`} style={{ marginTop: '12px' }}>
                  {scanStatus.type === 'success' ? '✓ ' : '⚠️ '}
                  <strong>{scanStatus.text}</strong>
                </div>
              )}

              {imagePreview && (
                <div className="checkin-preview-box">
                  <p className="checkin-preview-label">Ảnh vừa tải lên:</p>
                  <img src={imagePreview} alt="Ảnh xe tại barie" className="checkin-preview-img" />
                </div>
              )}
            </div>
          )}

          <div className="checkin-input-group" style={{ marginTop: '16px' }}>
            <label className="checkin-field-label">
              Biển số xe xác nhận
              {activeMode === 'image' && (
                <span className="checkin-readonly-notice"> (Tự động điền từ ảnh tải lên - không thể gõ tay)</span>
              )}
              <div className="checkin-input-wrap">
                <input
                  type="text"
                  value={plateInput}
                  onChange={e => {
                    if (activeMode !== 'image') setPlateInput(e.target.value.toUpperCase());
                  }}
                  readOnly={activeMode === 'image'}
                  onKeyDown={e => {
                    if (activeMode === 'image') e.preventDefault();
                  }}
                  placeholder={
                    activeMode === 'image'
                      ? (isScanning ? 'Đang nhận diện biển số từ ảnh...' : 'Biển số sẽ tự động điền sau khi tải ảnh...')
                      : 'Nhập biển số xe (VD: 81-AA12876)...'
                  }
                  className={`checkin-plate-input ${activeMode === 'image' ? 'is-readonly' : ''}`}
                  required
                  disabled={isProcessing || isScanning}
                />
                <button
                  type="submit"
                  className="primary checkin-submit-btn"
                  disabled={!plateInput || isProcessing || isScanning}
                >
                  {isProcessing ? 'Đang xử lý...' : 'Xác nhận Barie'}
                </button>
              </div>
            </label>
            <p className="checkin-hint">
              * Hệ thống sẽ tự động xác định xe đang vào (Check-in) hay đang rời bãi (Check-out) dựa vào trạng thái phiên đỗ hiện tại.
            </p>
          </div>
        </form>

        {logMessage && (
          <div className={`checkin-message ${logMessage.includes('❌') ? 'is-error' : 'is-success'}`} style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '18px' }}>{logMessage.includes('❌') ? '⚠️' : '✅'}</span>
            <span>{logMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
