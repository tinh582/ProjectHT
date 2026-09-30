import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import PreviewArea from './components/PreviewArea';
import ResultsList from './components/ResultsList';
import { runInferenceWithRetry } from './api/roboflow';

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(',')[1];

      setImageSrc(dataUrl);
      setBase64Data(base64);
      setResults(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setImageSrc(null);
    setBase64Data(null);
    setResults(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!base64Data) return;

    const apiKey = import.meta.env.VITE_ROBOFLOW_API_KEY;
    if (!apiKey) {
      setError("API Key is missing. Please set VITE_ROBOFLOW_API_KEY in the .env file.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiResult = await runInferenceWithRetry(apiKey, base64Data);
      processResults(apiResult);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processResults = (apiResult) => {
    let resultsArray = apiResult;
    if (apiResult && Array.isArray(apiResult.outputs)) {
      resultsArray = apiResult.outputs;
    }

    if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
      setError("Unexpected API response format");
      return;
    }

    const output = resultsArray[0];
    const parsedResults = [];

    for (const [key, value] of Object.entries(output)) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            if (item.x !== undefined && item.y !== undefined) {
              parsedResults.push(item);
            }
          } else if (typeof item === 'string') {
            parsedResults.push({ text: item, type: key });
          }
        });
      } else if (typeof value === 'string') {
        parsedResults.push({ text: value, type: key });
      }
    }

    if (parsedResults.length > 0) {
      setResults(parsedResults);
    } else {
      setError("No license plates detected in the image.");
      setResults(null);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>License Plate Scanner</h1>
        <p>Test the Roboflow Custom Workflow License Plate Model</p>
      </header>

      <main className="main-content">
        {!imageSrc ? (
          <ImageUploader onImageUpload={handleImageUpload} showError={setError} />
        ) : (
          <PreviewArea
            imageSrc={imageSrc}
            results={results}
            isLoading={isLoading}
            onScan={handleScan}
            onReset={handleReset}
          />
        )}

        {error && (
          <div className="error-box" style={{ display: 'block' }}>
            {error}
          </div>
        )}

        <ResultsList results={results} />
      </main>
    </div>
  );
}

export default App;
