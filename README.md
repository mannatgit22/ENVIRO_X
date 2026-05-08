# EnviroX - AI-Powered Greenwashing Detector

A Chrome browser extension that uses AI to detect greenwashing and false eco-claims on e-commerce platforms. Analyzes product listings on Amazon India, Flipkart, and Meesho to help you make informed sustainable shopping decisions.

## Features

- **AI-Powered Analysis**: Uses Claude 3.5 Sonnet or GPT-4 to analyze product claims
- **Multi-Platform Support**: Works on amazon.in, flipkart.com, and meesho.com
- **Smart Detection**: Only analyzes products with eco-claims (saves API costs)
- **Image OCR**: Extracts text from product images locally using Tesseract.js
- **Confidence Scoring**: Provides 0-100% confidence score on greenwashing likelihood
- **Evidence-Based Results**: Shows detected flags, contradictions, and ingredient citations
- **Caching**: Caches results per product URL to avoid re-analysis

## Prerequisites

- Google Chrome or Microsoft Edge browser
- API key from one of:
  - **Anthropic Claude** (Recommended): https://console.anthropic.com/
  - **OpenAI**: https://platform.openai.com/

## Installation

### Step 1: Get Your API Key

**For Anthropic Claude (Recommended):**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key (starts with `sk-ant-`)
5. Copy and save it securely

**For OpenAI:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new secret key (starts with `sk-`)
5. Copy and save it securely

### Step 2: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the EnviroX folder
5. The extension icon should appear in your toolbar

### Step 3: Configure API Key

1. Click the EnviroX icon in your browser toolbar
2. Select your AI provider (Anthropic Claude or OpenAI)
3. Paste your API key
4. Click **Save Settings**

## Usage

1. Navigate to a product page on Amazon India, Flipkart, or Meesho
2. A floating panel will appear on the right side of the page
3. Click **Analyze Product**
4. Wait 10-15 seconds for AI analysis
5. Review the results:
   - **Greenwashing Status**: Detected or No Major Issues
   - **Confidence Score**: 0-100% likelihood
   - **Red Flags**: List of suspicious claims with evidence
   - **Summary**: AI-generated explanation

### Understanding Results

**Confidence Score:**
- 0-40%: Low confidence in greenwashing (likely authentic)
- 40-70%: Moderate confidence (some concerns)
- 70-100%: High confidence (likely greenwashing)

**Common Red Flags:**
- Vague terms like "eco-friendly" without certification
- "100% natural" claims without evidence
- Fake eco-badges or symbols in images
- Unsupported biodegradable claims

## Project Structure

```
EnviroX/
├── manifest.json       # Extension configuration
├── background.js       # Service worker - API communication
├── content.js          # DOM extraction & panel injection
├── popup.html          # Settings popup interface
├── popup.js            # Settings logic
├── panel.css           # Floating panel styles
├── load-tesseract.js   # OCR library loader
├── icons/              # Extension icons
│   ├── icon.svg
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md
```

## Troubleshooting

### Panel doesn't appear
- Make sure you're on a product page (not search results)
- Refresh the page
- Check if the extension is enabled in `chrome://extensions/`

### "No API key configured" error
- Click the EnviroX icon and enter your API key
- Ensure the key format is correct:
  - Anthropic: starts with `sk-ant-`
  - OpenAI: starts with `sk-`

### Analysis fails
- Verify your API key is valid and has credits
- Check your internet connection
- Try switching AI providers

### "Could not extract product data" error
- The page might not be fully loaded - wait and try again
- You might be on a non-product page

## API Costs

The extension is optimized for token efficiency (~150-200 tokens per analysis).

**Anthropic Claude:**
- ~$0.005 per analysis
- ~1000+ analyses with $5 free credit

**OpenAI GPT-4o:**
- ~$0.003 per analysis
- ~1400+ analyses with $5 free credit

**Note:** Products without eco-claims are skipped entirely (0 tokens used).

## Privacy & Security

- API keys are stored locally in Chrome's secure storage
- No data is sent to third-party servers except the chosen AI provider
- Image OCR processing happens locally in browser
- No user tracking or analytics

## Supported Platforms

| Platform | URL |
|----------|-----|
| Amazon India | amazon.in |
| Flipkart | flipkart.com |
| Meesho | meesho.com |

## License

This project is open-source and available for educational and personal use.

---

Version: 2.3.1
