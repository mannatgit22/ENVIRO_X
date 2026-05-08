// EnviroX - Tesseract.js Loader
// Loads OCR library from CDN for image text extraction

(function() {
  'use strict';

  // Load Tesseract.js from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  script.async = true;

  script.onload = () => {
    console.log('EnviroX: Tesseract.js loaded successfully');
  };

  script.onerror = () => {
    console.error('EnviroX: Failed to load Tesseract.js from CDN');
  };

  document.head.appendChild(script);
})();
