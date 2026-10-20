import { HttpError } from './http.js';

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || 'UPHbYkgFOUsEMnAi67FN';
const ROBOFLOW_WORKSPACE = process.env.ROBOFLOW_WORKSPACE || 'asdfg-qwerty';
const ROBOFLOW_WORKFLOW_ID = process.env.ROBOFLOW_WORKFLOW_ID || 'custom-workflow-2';
const ROBOFLOW_ENDPOINT = `https://serverless.roboflow.com/${ROBOFLOW_WORKSPACE}/workflows/${ROBOFLOW_WORKFLOW_ID}`;

/**
 * Extracts license plate text from a base64 encoded image using Roboflow custom-workflow-2.
 * @param {string} rawImageInput - Base64 image data (with or without data URL prefix).
 * @param {number} maxRetries - Maximum retry attempts.
 * @returns {Promise<{ success: boolean, plate?: string, error?: string }>}
 */
export async function extractLicensePlate(rawImageInput, maxRetries = 2) {
  if (!rawImageInput || typeof rawImageInput !== 'string') {
    throw new HttpError(400, 'Hình ảnh không hợp lệ.');
  }

  // Strip data URL prefix if present
  let base64Value = rawImageInput;
  if (base64Value.includes('base64,')) {
    base64Value = base64Value.split('base64,')[1];
  }
  base64Value = base64Value.trim();

  if (!base64Value) {
    throw new HttpError(400, 'Dữ liệu hình ảnh trống.');
  }

  const payload = {
    inputs: {
      image: {
        type: 'base64',
        value: base64Value,
      },
    },
  };

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(ROBOFLOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ROBOFLOW_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Roboflow returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const outputs = result?.outputs;

      if (!Array.isArray(outputs) || outputs.length === 0) {
        return {
          success: false,
          error: 'Không nhận diện được phản hồi từ hệ thống OCR.',
        };
      }

      const plateData = outputs[0]?.license_plate_number;
      let plateText = '';

      if (Array.isArray(plateData) && plateData.length > 0) {
        plateText = plateData.join(' ').trim().toUpperCase();
      } else if (typeof plateData === 'string' && plateData.trim()) {
        plateText = plateData.trim().toUpperCase();
      }

      if (!plateText) {
        return {
          success: false,
          error: 'Không tìm thấy biển số xe trong ảnh. Vui lòng tải ảnh rõ nét chụp trực diện biển số xe.',
        };
      }

      // Remove any unwanted markdown or tags if leaked
      plateText = plateText.replace(/[`*#]/g, '').trim();

      return {
        success: true,
        plate: plateText,
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Backoff delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  console.error('Failed Roboflow plate extraction:', lastError);
  return {
    success: false,
    error: 'Không thể kết nối đến máy chủ nhận diện biển số xe. Vui lòng thử lại sau.',
  };
}
