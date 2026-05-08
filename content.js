// EnviroX Content Script - DOM Extraction and Panel Injection

(function() {
  'use strict';

  // Strict eco-claim keywords for trigger detection (20 tokens only)
  const ECO_CLAIM_KEYWORDS = [
    'organic', '100%', 'eco-friendly', 'biodegradable', 'chemical-free', 'natural',
    'toxin-free', 'sustainable', 'vegan', 'recyclable', 'compostable',
    'non-toxic', 'clean-label', 'pure', 'green', 'plant-based',
    'eco-conscious', 'zero-waste', 'carbon-neutral', 'cruelty-free', 'earth-friendly'
  ];

  // Site-specific selectors
  const SITE_SELECTORS = {
    'amazon.in': {
      title: '#productTitle, #title',
      description: '#productDescription, #feature-bullets, .a-section.a-spacing-medium',
      features: '#feature-bullets li, .a-unordered-list.a-vertical li',
      reviews: '[data-hook="review-body"] .review-text-content span, .review-text',
      images: '#altImages img, #imageBlock img, #landingImage',
      ingredients: '#important-information .a-section, [class*="ingredient"]',
      certifications: 'img[alt*="certified"], img[alt*="organic"], [class*="badge"], [class*="certification"]'
    },
    'flipkart.com': {
      title: '.B_NuCI, .yhB1nd, h1.yhB1nd',
      description: '._1mXcCf, ._3WHvuP, .+JWZww',
      features: '._1xXdx3 li, ._21Ahn- li, .row li',
      reviews: '.t-ZTKy, .qwjRop div',
      images: '._396cs4 img, ._2r_T1I img, .CXW8mj img',
      ingredients: '[class*="ingredient"], [class*="composition"]',
      certifications: 'img[class*="badge"], img[class*="certification"]'
    },
    'meesho.com': {
      title: 'h1, .sc-eDvSVe, .ProductCard__ProductName',
      description: '.sc-crrsfI, .ProductDetail__Description',
      features: '.sc-kfYoZR li, .ProductFeatures li',
      reviews: '.ReviewCard__ReviewText, .sc-hBUSln',
      images: '.ImageCarousel__Image img, .ProductImage__Img img',
      ingredients: '[class*="ingredient"], [class*="composition"]',
      certifications: 'img[class*="badge"]'
    }
  };

  // Detect current site
  function detectSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('amazon')) return 'amazon.in';
    if (hostname.includes('flipkart')) return 'flipkart.com';
    if (hostname.includes('meesho')) return 'meesho.com';
    return null;
  }

  // Detect eco-claims in text
  function detectEcoClaims(text) {
    if (!text) return [];
    const lowerText = text.toLowerCase();
    const detectedClaims = [];

    for (const keyword of ECO_CLAIM_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedClaims.push(keyword);
      }
    }

    return [...new Set(detectedClaims)]; // Remove duplicates
  }

  // Resize base64 image to 2000x2000 for OCR optimization
  async function resizeBase64Image(base64DataUrl, maxSize = 2000) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => {
        reject(new Error('Failed to load base64 image'));
      };

      // Set source to base64 data URL (no CORS issues since it's local data)
      img.src = base64DataUrl;
    });
  }

  // Perform OCR on image using Tesseract.js
  async function performOCR(imageDataUrl) {
    try {
      // Check if Tesseract is available (loaded from CDN)
      if (typeof Tesseract === 'undefined') {
        console.log('EnviroX: Tesseract.js not loaded, skipping OCR');
        return '';
      }

      const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: () => {} // Disable logging
      });

      return text.trim();
    } catch (error) {
      console.error('EnviroX OCR error:', error);
      return '';
    }
  }

  // Extract claim context from OCR text (5-10 words around each claim)
  function extractClaimContext(ocrText, detectedClaims) {
    const contexts = [];
    const words = ocrText.split(/\s+/);

    detectedClaims.forEach(claim => {
      const claimLower = claim.toLowerCase();
      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase().includes(claimLower)) {
          // Extract 5 words before and 5 after
          const start = Math.max(0, i - 5);
          const end = Math.min(words.length, i + 6);
          const context = words.slice(start, end).join(' ');
          contexts.push(context);
        }
      }
    });

    return contexts;
  }

  // Truncate text to save tokens
  function truncateText(text, maxChars) {
    if (!text || text.length <= maxChars) return text;
    return text.substring(0, maxChars).trim() + '...';
  }

  // Extract text from elements
  function extractText(selector, limit = null) {
    const elements = document.querySelectorAll(selector);
    let texts = Array.from(elements).map(el => el.innerText?.trim()).filter(text => text);
    if (limit) texts = texts.slice(0, limit);
    return texts.join(' ');
  }

  // Extract image URLs from DOM
  function extractImageUrls(selector, limit = 3) {
    const images = document.querySelectorAll(selector);
    return Array.from(images)
      .map(img => img.src || img.getAttribute('data-src'))
      .filter(src => src && src.startsWith('http'))
      .slice(0, limit);
  }

  // Fetch images from background.js (bypasses CORS)
  async function fetchImagesViaBackground(imageUrls) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'fetchImages', imageUrls },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('EnviroX: Failed to fetch images:', chrome.runtime.lastError.message);
            resolve([]);
            return;
          }

          if (response.error) {
            console.error('EnviroX: Image fetch error:', response.error);
            resolve([]);
            return;
          }

          resolve(response.base64Images || []);
        }
      );
    });
  }

  // Extract certifications from images
  function extractCertifications(selector) {
    const certElements = document.querySelectorAll(selector);
    const certs = [];

    certElements.forEach(el => {
      const alt = el.getAttribute('alt') || '';
      const title = el.getAttribute('title') || '';
      const text = alt || title;
      if (text) certs.push(text);
    });

    return [...new Set(certs)]; // Remove duplicates
  }

  // Extract negative reviews (for greenwashing indicators)
  function extractNegativeReviews(selector, limit = 3) {
    const reviews = document.querySelectorAll(selector);
    const negativeReviews = [];

    Array.from(reviews).forEach(review => {
      const text = review.innerText?.trim() || '';
      const lowerText = text.toLowerCase();

      // Look for negative keywords
      if (lowerText.includes('not') || lowerText.includes('fake') ||
          lowerText.includes('bad') || lowerText.includes('disappointed') ||
          lowerText.includes('misleading') || lowerText.includes('false')) {
        negativeReviews.push(truncateText(text, 30)); // Max 30 words
      }
    });

    return negativeReviews.slice(0, limit);
  }

  // Extract product data based on current site (comprehensive, pre-analysis)
  async function extractProductData() {
    const site = detectSite();
    if (!site) {
      console.log('EnviroX: Not on supported site');
      return null;
    }

    const selectors = SITE_SELECTORS[site];

    // Step 1: Extract title and first 100 chars of description
    const titleText = extractText(selectors.title) || document.querySelector('h1')?.innerText || '';
    const fullDescriptionText = extractText(selectors.description) ||
                                 extractText('.description, [class*="description"]');
    const first100Chars = fullDescriptionText.substring(0, 100);

    // Step 2: STRICT claim detection - title + first 100 chars only
    const scanText = titleText + ' ' + first100Chars;
    let detectedClaims = detectEcoClaims(scanText);

    // Step 3: If no claims in title/description, check OCR before skipping
    const ocrTexts = [];
    if (detectedClaims.length === 0) {
      console.log('EnviroX: No claims in title/description, checking OCR...');

      const imageUrls = extractImageUrls(selectors.images, 1); // Only first image for claim check
      if (imageUrls.length > 0) {
        try {
          const base64Images = await fetchImagesViaBackground(imageUrls);
          if (base64Images.length > 0) {
            const resizedImage = await resizeBase64Image(base64Images[0]);
            const ocrText = await performOCR(resizedImage);

            if (ocrText) {
              const ocrClaims = detectEcoClaims(ocrText);
              if (ocrClaims.length > 0) {
                detectedClaims = ocrClaims;
                console.log('EnviroX: Claims found in OCR:', ocrClaims);
                ocrTexts.push(ocrText);
              }
            }
          }
        } catch (error) {
          console.error('EnviroX: OCR claim check failed:', error);
        }
      }

      // Final check - if still no claims, skip analysis
      if (detectedClaims.length === 0) {
        console.log('EnviroX: No eco-claims detected anywhere (title, description, OCR)');
        return { noEcoClaims: true };
      }
    }

    console.log('EnviroX: Proceeding with analysis. Detected claims:', detectedClaims);

    // Step 4: Extract comprehensive data
    const product = {
      title: titleText,
      full_description: fullDescriptionText,
      ingredients: extractText(selectors.ingredients) ||
                   extractText('[class*="ingredient"], [class*="composition"]'),
      features: extractText(selectors.features) || extractText('li, ul li'),
      reviews: extractNegativeReviews(selectors.reviews, 3),
      certifications: extractCertifications(selectors.certifications),
      detected_claims: detectedClaims,
      url: window.location.href,
      site: site
    };

    // Step 5: Fetch remaining images for full OCR analysis (if claims already found in text)
    if (ocrTexts.length === 0) {
      const imageUrls = extractImageUrls(selectors.images, 3);
      if (imageUrls.length > 0) {
        console.log(`EnviroX: Fetching ${imageUrls.length} images via background.js`);
        const base64Images = await fetchImagesViaBackground(imageUrls);

        for (let i = 0; i < base64Images.length; i++) {
          try {
            console.log(`EnviroX: Processing image ${i + 1}/${base64Images.length}`);
            const resizedImage = await resizeBase64Image(base64Images[i]);
            const ocrText = await performOCR(resizedImage);

            if (ocrText) {
              // Extract only claim contexts from OCR
              const contexts = extractClaimContext(ocrText, detectedClaims);
              if (contexts.length > 0) {
                ocrTexts.push(...contexts);
              }
            }
          } catch (error) {
            console.error(`EnviroX: Image ${i + 1} processing error:`, error);
          }
        }
      }
    }

    product.ocr_text = ocrTexts;

    console.log('EnviroX: Extracted comprehensive data:', {
      ...product,
      ocr_text_count: ocrTexts.length
    });

    return product;
  }

  // Create floating panel
  function createPanel() {
    // Remove existing panel if any
    const existingPanel = document.getElementById('envirox-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'envirox-panel';
    panel.innerHTML = `
      <div class="envirox-header" id="envirox-header">
        <div class="envirox-logo">
          <h3>EnviroX</h3>
          <span class="envirox-status-badge">Ready</span>
        </div>
        <button class="envirox-close" id="envirox-close">✕</button>
      </div>

      <div class="envirox-content" id="envirox-content">
        <div class="envirox-initial">
          <p>AI-powered greenwashing detection for conscious shopping</p>
          <button class="envirox-analyze-btn" id="envirox-analyze">
            Analyze Product
          </button>
        </div>
      </div>

      <div class="envirox-resize-handle" id="envirox-resize-handle"></div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    document.getElementById('envirox-close').addEventListener('click', () => {
      panel.style.transform = 'translateX(100%)';
      setTimeout(() => panel.remove(), 300);
    });

    document.getElementById('envirox-analyze').addEventListener('click', analyzeProduct);

    // Make panel draggable
    const header = document.getElementById('envirox-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
      // Don't drag if clicking the close button
      if (e.target.id === 'envirox-close' || e.target.closest('#envirox-close')) {
        return;
      }

      isDragging = true;
      panel.style.transition = 'none';

      // Get current position
      const rect = panel.getBoundingClientRect();
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    });

    function drag(e) {
      if (!isDragging) return;

      e.preventDefault();

      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Keep panel within viewport
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;

      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
    }

    function stopDrag() {
      isDragging = false;
      panel.style.transition = '';
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }

    // Make panel resizable
    const resizeHandle = document.getElementById('envirox-resize-handle');
    let isResizing = false;
    let startWidth;
    let startHeight;
    let startMouseX;
    let startMouseY;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      e.preventDefault();
      e.stopPropagation();

      startWidth = panel.offsetWidth;
      startHeight = panel.offsetHeight;
      startMouseX = e.clientX;
      startMouseY = e.clientY;

      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
    });

    function resize(e) {
      if (!isResizing) return;

      e.preventDefault();

      const deltaX = e.clientX - startMouseX;
      const deltaY = e.clientY - startMouseY;

      const newWidth = startWidth + deltaX;
      const newHeight = startHeight + deltaY;

      // Apply min/max constraints
      const minWidth = 320;
      const maxWidth = 600;
      const minHeight = 400;
      const maxHeight = window.innerHeight - 40;

      panel.style.width = Math.max(minWidth, Math.min(newWidth, maxWidth)) + 'px';
      panel.style.height = Math.max(minHeight, Math.min(newHeight, maxHeight)) + 'px';
    }

    function stopResize() {
      isResizing = false;
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    }

    // Show panel with animation
    setTimeout(() => panel.classList.add('show'), 100);
  }

  // Professional loading quotes
  const loadingQuotes = [
    "Transparency is the cornerstone of trust.",
    "Sustainability requires accountability.",
    "Every claim deserves scrutiny.",
    "Real impact speaks for itself.",
    "Authentic change needs no embellishment."
  ];

  // Show loading state
  function showLoading(message = 'Analyzing product for greenwashing...', detail = 'This may take 10-15 seconds') {
    const randomQuote = loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)];
    const content = document.getElementById('envirox-content');
    content.innerHTML = `
      <div class="envirox-loading">
        <div class="envirox-spinner"></div>
        <p>${message}</p>
        <small>${detail}</small>
        <div class="envirox-loading-quote">${randomQuote}</div>
      </div>
    `;
  }

  // Show no claims detected message
  function showNoClaims() {
    const content = document.getElementById('envirox-content');
    content.innerHTML = `
      <div class="envirox-no-claims">
        <h4>No Eco-Claims Detected</h4>
        <p>This product doesn't make environmental or sustainability claims.</p>
        <small>Analysis is only performed on products with claims like "organic", "biodegradable", or "eco-friendly".</small>
        <button class="envirox-retry-btn" id="envirox-retry">Close</button>
      </div>
    `;
    document.getElementById('envirox-retry').addEventListener('click', () => {
      const panel = document.getElementById('envirox-panel');
      panel.style.transform = 'translateX(420px)';
      setTimeout(() => panel.remove(), 400);
    });
  }

  // Show error state
  function showError(message) {
    const content = document.getElementById('envirox-content');
    content.innerHTML = `
      <div class="envirox-error">
        <strong>Unable to Complete Analysis</strong>
        <p>${message}</p>
        <button class="envirox-retry-btn" id="envirox-retry">Try Again</button>
      </div>
    `;
    document.getElementById('envirox-retry').addEventListener('click', analyzeProduct);
  }

  // Show results
  function showResults(data, tokenUsage = null) {
    const content = document.getElementById('envirox-content');

    const confidenceColor = data.confidence > 70 ? '#e11d48' :
                            data.confidence > 40 ? '#d97706' : '#0d9488';

    const statusText = data.is_greenwashed ? 'Greenwashing Detected' : 'No Major Issues Found';
    const statusClass = data.is_greenwashed ? 'alert' : 'safe';

    let flagsHTML = '';
    if (data.flags && data.flags.length > 0) {
      flagsHTML = `
        <div class="envirox-section envirox-flags">
          <h4>Issues Found</h4>
          <ul>
            ${data.flags.map(flag => `<li>${flag}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let evidenceHTML = '';
    if (data.evidence) {
      const hasEvidence = (data.evidence.ingredients_contradictions && data.evidence.ingredients_contradictions.length > 0) ||
                         (data.evidence.review_mentions && data.evidence.review_mentions.length > 0) ||
                         (data.evidence.ocr_claims && data.evidence.ocr_claims.length > 0);

      if (hasEvidence) {
        evidenceHTML = `
          <div class="envirox-section">
            <h4>Evidence</h4>
            <ul>
              ${data.evidence.ingredients_contradictions && data.evidence.ingredients_contradictions.length > 0 ?
                data.evidence.ingredients_contradictions.map(ing => `<li>Ingredient: ${ing}</li>`).join('') : ''}
              ${data.evidence.review_mentions && data.evidence.review_mentions.length > 0 ?
                data.evidence.review_mentions.map(review => `<li>Review: "${review}"</li>`).join('') : ''}
              ${data.evidence.ocr_claims && data.evidence.ocr_claims.length > 0 ?
                data.evidence.ocr_claims.map(ocr => `<li>Package: ${ocr}</li>`).join('') : ''}
            </ul>
          </div>
        `;
      }
    }

    let tokenUsageHTML = '';
    if (tokenUsage) {
      tokenUsageHTML = `
        <div class="envirox-section envirox-token-usage">
          <h4>Token Usage</h4>
          <div class="token-stats">
            <div class="token-stat">
              <span class="token-label">Input</span>
              <span class="token-value">${tokenUsage.input.toLocaleString()}</span>
            </div>
            <div class="token-stat">
              <span class="token-label">Output</span>
              <span class="token-value">${tokenUsage.output.toLocaleString()}</span>
            </div>
            <div class="token-stat total">
              <span class="token-label">Total</span>
              <span class="token-value">${tokenUsage.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="envirox-results">
        <div class="envirox-status ${statusClass}">
          <h4>${statusText}</h4>
        </div>

        <div class="envirox-confidence">
          <div class="confidence-label">
            <span>Confidence</span>
            <strong>${data.confidence}%</strong>
          </div>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${data.confidence}%; background-color: ${confidenceColor};"></div>
          </div>
        </div>

        ${flagsHTML}

        <div class="envirox-section envirox-summary">
          <h4>Assessment</h4>
          <p>${data.summary}</p>
        </div>

        ${evidenceHTML}

        ${tokenUsageHTML}

        <button class="envirox-reanalyze-btn" id="envirox-reanalyze">
          Analyze Again
        </button>
      </div>
    `;

    document.getElementById('envirox-reanalyze').addEventListener('click', analyzeProduct);
  }

  // Analyze product
  async function analyzeProduct() {
    // Step 1: Show initial loading
    showLoading('Extracting product data...', 'Checking for eco-claims');

    try {
      // Step 2: Extract product data (now async due to OCR)
      const productData = await extractProductData();

      if (!productData) {
        showError('Could not extract product data. Make sure you are on a product page.');
        return;
      }

      // Step 3: Check if eco-claims detected
      if (productData.noEcoClaims) {
        showNoClaims();
        return;
      }

      if (!productData.title) {
        showError('Could not extract product title. Make sure you are on a product page.');
        return;
      }

      // Step 4: Show image download and OCR progress
      showLoading('Downloading images from CDN...', 'Fetching product images securely');

      // Small delay to show message
      await new Promise(resolve => setTimeout(resolve, 300));

      showLoading('Processing images with OCR...', 'Extracting text from product images (this may take 10-15 seconds)');

      // Wait a bit more for OCR message visibility
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Show API call progress
      showLoading('Analyzing with AI...', 'GPT-4.1 is analyzing greenwashing indicators');

      // Step 6: Send to background for API analysis
      chrome.runtime.sendMessage(
        { action: 'analyzeProduct', data: productData },
        (response) => {
          if (chrome.runtime.lastError) {
            showError('Extension error: ' + chrome.runtime.lastError.message);
            return;
          }

          if (response.error) {
            showError(response.error);
          } else {
            showResults(response.result, response.tokenUsage);
          }
        }
      );
    } catch (error) {
      console.error('EnviroX analysis error:', error);
      showError('Failed to analyze product: ' + error.message);
    }
  }

  // Initialize extension
  function init() {
    // Check if we're on a product page
    const site = detectSite();
    if (!site) return;

    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createPanel);
    } else {
      createPanel();
    }
  }

  // Start the extension
  init();
})();
