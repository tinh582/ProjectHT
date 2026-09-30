import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function VehicleDialog({ userId, onClose, onSaved, vehicleToEdit }) {
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  
  const isEditMode = !!vehicleToEdit;

  useEffect(() => {
    if (vehicleToEdit && vehicleToEdit.image) {
      setImageBase64(vehicleToEdit.image);
    }
  }, [vehicleToEdit]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const vehicle = {
      user_id: userId,
      type: formData.get('type'),
      brand: formData.get('brand'),
      model: formData.get('model'),
      color: formData.get('color'),
      plate: formData.get('plate'),
      months: parseInt(formData.get('months')),
    };

    if (imageBase64) {
      vehicle.image = imageBase64;
    }

    let error;

    if (isEditMode) {
      const res = await supabase.from('vehicles').update(vehicle).eq('id', vehicleToEdit.id);
      error = res.error;
    } else {
      const res = await supabase.from('vehicles').insert([vehicle]);
      error = res.error;
    }
    
    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <dialog open id="vehicle-dialog">
      <form onSubmit={handleSubmit}>
        <h2>{isEditMode ? 'Sửa phương tiện' : 'Thêm phương tiện'}</h2>
        <div className="form-grid">
          <label>Hình ảnh xe
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          {imageBase64 && (
            <div className="image-preview">
              <img src={imageBase64} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
            </div>
          )}
          <label>Loại phương tiện
            <select name="type" defaultValue={vehicleToEdit?.type || "Xe máy"}>
              <option>Xe máy</option>
              <option>Ô tô</option>
            </select>
          </label>
          <label>Hãng xe <input name="brand" required defaultValue={vehicleToEdit?.brand || ""} /></label>
          <label>Mẫu xe <input name="model" required defaultValue={vehicleToEdit?.model || ""} /></label>
          <label>Màu sắc <input name="color" required defaultValue={vehicleToEdit?.color || ""} /></label>
          <label>Biển số xe <input name="plate" required defaultValue={vehicleToEdit?.plate || ""} /></label>
          <label>Thời hạn (tháng) <input name="months" type="number" defaultValue={vehicleToEdit?.months || "1"} required /></label>
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>Hủy</button>
          <button type="submit" className="primary" disabled={loading}>
            {isEditMode ? 'Cập nhật' : 'Lưu phương tiện'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
