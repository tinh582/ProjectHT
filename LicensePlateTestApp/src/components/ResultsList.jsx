import React from 'react';

export default function ResultsList({ results }) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="results-section">
      <h2>Results</h2>
      <div className="results-list">
        {results.map((result, index) => {
          const plateText = result.licence_plate_number || result.text || result.class || "Unknown";
          const confidence = result.confidence ? Math.round(result.confidence * 100) : null;
          
          return (
            <div key={index} className="result-item">
              <span className="result-plate">{plateText}</span>
              {confidence && <span className="result-confidence">Confidence: {confidence}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
