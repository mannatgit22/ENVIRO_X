<div align="center">

<img src="https://img.shields.io/badge/-JavaScript-black?style=for-the-badge&logoColor=white&logo=javascript&color=F7DF1E" alt="javascript" />
<img src="https://img.shields.io/badge/-HTML5-black?style=for-the-badge&logoColor=white&logo=html5&color=E34F26" alt="html5" />
<img src="https://img.shields.io/badge/-CSS3-black?style=for-the-badge&logoColor=white&logo=css3&color=1572B6" alt="css3" />
<img src="https://img.shields.io/badge/-Chrome_Extensions-black?style=for-the-badge&logoColor=white&logo=googlechrome&color=4285F4" alt="chrome" />
<img src="https://img.shields.io/badge/-Tesseract.js-black?style=for-the-badge&logoColor=white&logo=javascript&color=39457E" alt="tesseract" />

<h1>🌿 EnviroX</h1>

### AI-Powered Greenwashing Detector

*A Chrome extension that detects false eco-claims on e-commerce platforms to help you shop sustainably.*


</div>

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Installation](#installation)
6. [Usage](#usage)
7. [Supported Platforms](#supported-platforms)
8. [Troubleshooting](#troubleshooting)

---

## 🤖 Introduction

**EnviroX** is a Chrome browser extension that analyses product listings on e-commerce platforms and detects greenwashing — false or misleading eco-friendly claims made by brands. It uses AI to evaluate product descriptions and images, then displays a confidence score and a list of flagged claims directly on the product page.

Supports **Amazon India**, **Flipkart**, and **Meesho**.

---

## ⚙️ Tech Stack

| Purpose | Technology |
|---------|-----------|
| **Extension UI** | HTML, CSS, JavaScript |
| **Browser API** | Chrome Extensions API (Manifest V3) |
| **Image OCR** | Tesseract.js (local, in-browser) |
| **AI Analysis** | Claude 3.5 Sonnet / GPT-4 (via API) |
| **Caching** | Chrome Storage API |

---

## ✨ Features

- **Greenwashing Detection** — Analyses product eco-claims using AI and flags suspicious ones
- **Confidence Score** — Displays a 0–100% likelihood score for greenwashing
- **Image OCR** — Extracts text from product images locally using Tesseract.js
- **Floating Panel UI** — Clean side panel injected into product pages showing results
- **Smart Detection** — Only analyses products that contain eco-claims (saves API usage)
- **Result Caching** — Caches analysis per product URL to avoid repeated API calls
- **Multi-Platform** — Works on Amazon India, Flipkart, and Meesho

---

## 🗂️ Project Structure

```
EnviroX/
├── manifest.json         # Extension configuration (Manifest V3)
├── background.js         # Service worker — handles API communication
├── content.js            # DOM extraction and floating panel injection
├── popup.html            # Settings popup interface
├── popup.js              # Settings logic (API key, provider selection)
├── panel.css             # Floating panel styles
├── load-tesseract.js     # OCR library loader
├── icons/                # Extension icons
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md
```

---

## 🤸 Installation

### Step 1 — Clone the Repository

```bash
git clone https://github.com/mannatgit22/EnviroX.git
cd EnviroX
```

### Step 2 — Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `EnviroX` folder
5. The EnviroX icon will appear in your toolbar

### Step 3 — Add Your API Key

1. Click the EnviroX icon in your toolbar
2. Select your AI provider (Claude or GPT-4)
3. Paste your API key
4. Click **Save Settings**

---

## 📖 Usage

1. Go to any product page on Amazon India, Flipkart, or Meesho
2. A floating panel appears on the right side of the page
3. Click **Analyze Product**
4. Review the results:
   - **Status** — Greenwashing Detected / No Major Issues
   - **Confidence Score** — 0–100% likelihood
   - **Red Flags** — List of suspicious claims with evidence
   - **Summary** — AI-generated explanation

### Confidence Score Guide

| Score | Meaning |
|-------|---------|
| 0–40% | Low — product claims likely authentic |
| 40–70% | Moderate — some concerns found |
| 70–100% | High — likely greenwashing |

---

## 🌐 Supported Platforms

| Platform | URL |
|----------|-----|
| Amazon India | amazon.in |
| Flipkart | flipkart.com |
| Meesho | meesho.com |

---

## 🛠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| Panel doesn't appear | Make sure you're on a product page, not search results |
| No API key error | Click the extension icon and enter your API key |
| Analysis fails | Check your API key is valid and has available credits |
| Can't extract product data | Wait for the page to fully load, then try again |

---

## 🔒 Privacy

- API keys are stored locally in Chrome's secure storage
- Image OCR runs entirely in the browser — no images are uploaded
- No user tracking or analytics of any kind

---

---

<div align="center">

**Made for Sustainable Shopping 🌍**

[⬆ Back to Top](#-envirox)

</div>
