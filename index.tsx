
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill process for browser environments where modules don't automatically see window.process
if (typeof (window as any).process !== 'undefined' && typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = (window as any).process;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
