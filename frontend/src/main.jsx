import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ApiNotice from './components/shared/ApiNotice.jsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApiNotice />
    <App />
  </React.StrictMode>
);
