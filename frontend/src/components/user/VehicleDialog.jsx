import { apiFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';

export default function VehicleDialog({ userId, onClose, onSaved, vehicleToEdit }) {
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  const [plate, setPlate] = useState(vehicleToEdit?.plate || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  const isEditMode = !!vehicleToEdit;

  useEffect(() => {
    if (vehicleToEdit && vehicleToEdit.image) {
      setImageBase64(vehicleToEdit.image);
    }
    if (vehicleToEdit && vehicleToEdit.plate) {
      setPlate(vehicleToEdit.plate);
    }
  }, [vehicleToEdit]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1500000 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Vui lòng chọn ảnh PNG, JPEG, WebP hoặc GIF nhỏ hơn 1.5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setImageBase64(base64Data);
      setScanError(null);
      setScanSuccess(false);
      setIsScanning(true);

      try {
        const response = await apiFetch('/api/components/user/VehicleDialog/extract-plate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data }),
        });

        const data = await response.json();
        if (response.ok && data.success && data.plate) {
          setPlate(data.plate);
          setScanSuccess(true);
        } else {
          setScanError(data.error || 'AI chưa nhận diện rõ biển số từ ảnh này. Bạn có thể tải ảnh khác hoặc nhập biển số thủ công (AI Fallback).');
        }
      } catch (err) {
        setScanError('Dịch vụ AI đang bận. Đã kích hoạt chế độ nhập biển số dự phòng (AI Fallback).');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditMode && !imageBase64) {
      alert('Hình ảnh phương tiện là bắt buộc.');
      return;
    }

    if (!plate || !plate.trim()) {
      alert('Vui lòng cung cấp biển số xe hợp lệ.');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.target);
    const vehicle = {
      user_id: userId,
      type: formData.get('type'),
      brand: formData.get('brand'),
      model: formData.get('model'),
      color: formData.get('color'),
      plate: plate.trim().toUpperCase(),
      months: parseInt(formData.get('months')),
    };

    if (imageBase64) {
      vehicle.image = imageBase64;
    }

    try {
      let response;
      if (isEditMode) {
        response = await apiFetch(`/api/components/user/VehicleDialog/${vehicleToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicle }),
        });
      } else {
        response = await apiFetch('/api/components/user/VehicleDialog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicle }),
        });
      }

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData.error || 'Lỗi khi lưu phương tiện.');
      }

      onSaved?.(resData.vehicle || vehicle);
      onClose();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content md vehicle-modal-content" onClick={e => e.stopPropagation()}>
        <button type="button" className="slot-info-close" onClick={onClose} disabled={loading || isScanning}>✕</button>
        <form onSubmit={handleSubmit}>
          <h2>{isEditMode ? 'Sửa phương tiện' : 'Thêm phương tiện mới'}</h2>
          <p className="dialog-instruction">
            {isEditMode
              ? 'Cập nhật thông tin phương tiện. Bạn có thể tải ảnh mới để quét lại biển số xe.'
              : 'Tải lên hình ảnh xe của bạn (phải thấy rõ biển số). Hệ thống AI sẽ tự động trích xuất biển số xe.'}
          </p>

          <div className="form-grid">
            <div className="upload-section" style={{ gridColumn: '1 / -1' }}>
              <label>
                Hình ảnh phương tiện {isEditMode ? '(Tùy chọn tải ảnh mới)' : '(Bắt buộc - phải có biển số rõ nét)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!isEditMode && !imageBase64}
                  disabled={loading || isScanning}
                />
              </label>

              {isScanning && (
                <div className="plate-scan-status scanning">
                  <span className="spinner-dot">⏳</span> Đang phân tích ảnh và trích xuất biển số xe qua Roboflow AI...
                </div>
              )}

              {scanSuccess && plate && (
                <div className="plate-scan-status success">
                  ✓ Đã trích xuất biển số thành công: <strong>{plate}</strong>
                </div>
              )}

              {scanError && (
                <div className="plate-scan-status error">
                  ⚠️ {scanError}
                </div>
              )}

              {imageBase64 && (
                <div className="image-preview" style={{ marginTop: '10px' }}>
                  <img src={imageBase64} alt="Preview xe" className="vehicle-dialog-preview" style={{ maxHeight: '160px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                </div>
              )}
            </div>

            <label style={{ gridColumn: '1 / -1' }}>
              Biển số xe <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>(Tự động điền bởi AI hoặc nhập dự phòng)</span>
              <input
                name="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                readOnly={scanSuccess && !scanError}
                placeholder={isScanning ? 'Đang nhận diện biển số xe...' : 'Ví dụ: 51A-123.45'}
                className={scanSuccess && !scanError ? 'plate-readonly-input' : ''}
                required
              />
            </label>

            <label>Loại phương tiện
              <select name="type" defaultValue={vehicleToEdit?.type || 'Ô tô'}>
                <option value="Ô tô">Ô tô</option>
                <option value="Xe máy">Xe máy</option>
              </select>
            </label>

            <label>Hãng xe <input name="brand" required defaultValue={vehicleToEdit?.brand || ''} placeholder="Ví dụ: Toyota, Honda..." /></label>
            <label>Mẫu xe <input name="model" required defaultValue={vehicleToEdit?.model || ''} placeholder="Ví dụ: Vios, Vision..." /></label>
            <label>Màu sắc <input name="color" required defaultValue={vehicleToEdit?.color || ''} placeholder="Ví dụ: Đen, Trắng, Đỏ..." /></label>
            <label>Thời hạn (tháng) <input name="months" type="number" min="1" max="120" defaultValue={vehicleToEdit?.months || '1'} required /></label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose} disabled={loading || isScanning}>Hủy</button>
            <button
              type="submit"
              className="primary"
              disabled={loading || isScanning || (!isEditMode && (!imageBase64 || !plate.trim()))}
            >
              {isScanning
                ? 'Đang nhận diện biển số...'
                : loading
                  ? 'Đang lưu...'
                  : (isEditMode ? 'Cập nhật' : 'Lưu phương tiện')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
