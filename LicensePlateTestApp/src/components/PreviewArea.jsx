import React, { useEffect, useRef } from 'react';

export default function PreviewArea({ imageSrc, results, isLoading, onScan, onReset }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      // If we have results, draw bounding boxes
      if (results && results.length > 0) {
        results.forEach(box => {
          if (box.x !== undefined && box.y !== undefined && box.width !== undefined && box.height !== undefined) {
            drawBoundingBox(ctx, canvas, box);
          }
        });
      }
    };
    
    image.src = imageSrc;
  }, [imageSrc, results]);

  const drawBoundingBox = (ctx, canvas, box) => {
    const isCenter = box.x > 0 && box.y > 0 && (box.x + box.width / 2 <= canvas.width || box.x - box.width / 2 >= 0);
    
    let left = box.x;
    let top = box.y;
    
    if (isCenter) {
      left = box.x - box.width / 2;
      top = box.y - box.height / 2;
    }

    ctx.strokeStyle = '#10b981'; // Green
    ctx.lineWidth = Math.max(3, canvas.width / 300);
    ctx.strokeRect(left, top, box.width, box.height);

    const plateText = box.licence_plate_number || box.text || box.class || "";
    
    if (plateText) {
      const fontSize = Math.max(16, canvas.width / 50);
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      
      const padding = 6;
      const textWidth = ctx.measureText(plateText).width;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(left, top - fontSize - padding * 2, textWidth + padding * 2, fontSize + padding * 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.fillText(plateText, left + padding, top - fontSize - padding);
    }
  };

  return (
    <div className="preview-section">
      <div className="canvas-container">
        <canvas ref={canvasRef} id="outputCanvas"></canvas>
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <span>Processing...</span>
          </div>
        )}
      </div>
      <div className="controls">
        <button className="primary-btn" onClick={onScan} disabled={isLoading}>
          Scan License Plate
        </button>
        <button className="secondary-btn" onClick={onReset} disabled={isLoading}>
          Reset
        </button>
      </div>
    </div>
  );
}
