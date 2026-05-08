// EnviroX Background Service Worker - API Communication

// API Configuration
const API_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai'
};

// Get API configuration from storage
async function getAPIConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiProvider', 'apiKey', 'openaiModel'], (result) => {
      resolve({
        provider: result.apiProvider || API_PROVIDERS.ANTHROPIC,
        apiKey: result.apiKey || '',
        openaiModel: result.openaiModel || 'gpt-4.1'
      });
    });
  });
}

// Build ultra-efficient analysis prompt
function buildPrompt(productData) {
  const reviewsStr = Array.isArray(productData.reviews) ?
    JSON.stringify(productData.reviews) : productData.reviews || '[]';

  const ocrStr = Array.isArray(productData.ocr_text) ?
    JSON.stringify(productData.ocr_text) : '[]';

  const claimsStr = Array.isArray(productData.detected_claims) ?
    JSON.stringify(productData.detected_claims) : '[]';

  const certsStr = Array.isArray(productData.certifications) ?
    JSON.stringify(productData.certifications) : '[]';

  return `You are an environmental compliance analyst.

Product:
- Title: ${productData.title}
- Full Description: ${productData.full_description || productData.description || ''}
- Ingredients: ${productData.ingredients || 'Not specified'}
- Features: ${productData.features || 'Not specified'}
- TopNegativeReviews: ${reviewsStr}
- OCR_Text_From_Images: ${ocrStr}
- Detected_Claims: ${claimsStr}
- Certifications_Found: ${certsStr}

CRITICAL INSTRUCTIONS:
1. Auto-detect product category from title/description: cosmetics, cleaning, food, furniture/textiles, or general.

2. Ingredient Analysis BY CATEGORY:

Cosmetics / Skincare:
   - Check whether each detected eco-claim (e.g., 100% natural, organic, chemical-free, vegan) is supported by the listed ingredients.
   - Flag ingredients that are harmful to skin or health (irritants, allergens, toxic chemicals).
   - If claiming "100% natural" or "organic", all ingredients must be naturally derived or organically sourced.
   - Presence of any synthetic, semi-synthetic, or petrochemical ingredient (e.g., SLS, PEG, parabens, dyes, silicones) contradicts those claims.

Cleaning Products:
   - Validate eco-claims like eco-friendly, biodegradable, chemical-free, non-toxic.
   - Flag ingredients that are environmentally hazardous, non-biodegradable, or petroleum-based.
   - Claims must align with ingredient biodegradability and toxicity.

Food / Beverages:
   - Check that health or purity claims (e.g., organic, sugar-free, natural ingredients) match actual composition.
   - Flag contradictions such as synthetic additives, artificial flavors, or preservatives in organic/natural claims.

Furniture / Textiles:
   - Verify sustainability or material-based eco-claims (e.g., eco-friendly, sustainable fabric, biodegradable).
   - Flag synthetic, plastic, or petroleum-derived materials if such eco-claims are present.

3. Review Analysis:
   - Only use reviews if ≥2 reviews explicitly mention false eco-claims
   - Otherwise ignore reviews completely

4. Confidence Scoring Formula:
   - Ingredient contradictions: 80%
   - Certification issues: 5%
   - Review support: 5%
   - OCR claim match: 10%

5. Greenwashing Decision:
   - Mark greenwashing_detected=true ONLY if ingredient contradictions exist
   - If claims are supported by ingredients → greenwashing_detected=false (even if minor issues)

6. Confirm which Detected_Claims appear in description or OCR.

7. For each claim, check whether ingredients support or contradict based on category rules above.

Return JSON only, minimal and professional, exact schema:
{
  "status":"Analyzed",
  "greenwashing_detected": true/false,
  "confidence_score": integer,
  "violated_claims": [{"claim":"...","reason":"short reason citing specific harmful ingredient"}],
  "supported_claims": ["..."],
  "certifications": ["..."],
  "evidence": {
     "ingredients_contradictions": ["Ingredient A","Ingredient B"],
     "review_mentions": ["short quote 1","short quote 2"],
     "ocr_claims": ["..."]
  },
  "final_assessment":"one-line professional summary"
}`;
}

// Helper function to sanitize and validate JSON
function sanitizeJSON(jsonString) {
  // Check if JSON has matching braces
  const openBraces = (jsonString.match(/\{/g) || []).length;
  const closeBraces = (jsonString.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    console.warn('EnviroX: JSON has mismatched braces', { openBraces, closeBraces });
    // Try to close unclosed braces
    if (openBraces > closeBraces) {
      jsonString += '}'.repeat(openBraces - closeBraces);
    }
  }

  // Remove newlines, carriage returns, and tabs from the entire string first
  let cleaned = jsonString
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .trim();

  // Replace literal newlines within string values with escaped newlines
  // This regex finds strings and replaces newlines inside them
  cleaned = cleaned.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\n/g, '\\n');
  });

  // Remove any remaining bare newlines outside of strings
  cleaned = cleaned.replace(/\n/g, ' ');

  // Fix common JSON issues
  cleaned = cleaned
    // Remove trailing commas before closing braces/brackets
    .replace(/,(\s*[}\]])/g, '$1')
    // Ensure proper spacing around colons
    .replace(/"\s*:\s*/g, '":')
    // Fix double-escaped quotes
    .replace(/\\\\"/g, '\\"');

  return cleaned;
}

// Call Anthropic Claude API
async function callAnthropicAPI(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,  // Increased to prevent JSON truncation
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  const textContent = data.content[0].text;

  // Extract JSON from response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('EnviroX: No JSON found in response:', textContent);
    throw new Error('Could not parse API response - no JSON found');
  }

  // Parse JSON with better error handling
  let parsedResult;
  try {
    // First attempt: parse as-is
    parsedResult = JSON.parse(jsonMatch[0]);
    console.log('EnviroX: Successfully parsed JSON on first attempt');
  } catch (parseError) {
    console.error('EnviroX: JSON parse error:', parseError);
    console.error('EnviroX: Problematic JSON:', jsonMatch[0].substring(0, 1000));

    // Second attempt: sanitize and parse
    try {
      const sanitizedJson = sanitizeJSON(jsonMatch[0]);
      console.log('EnviroX: Attempting to parse sanitized JSON');
      parsedResult = JSON.parse(sanitizedJson);
      console.log('EnviroX: Successfully parsed sanitized JSON');
    } catch (secondError) {
      console.error('EnviroX: Failed to parse even after sanitization');
      console.error('EnviroX: Sanitized JSON:', sanitizedJson?.substring(0, 1000));
      throw new Error(`Failed to parse API response: ${parseError.message}. The AI response may be incomplete or malformed.`);
    }
  }

  // Return result with token usage
  return {
    result: parsedResult,
    tokenUsage: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
      total: data.usage.input_tokens + data.usage.output_tokens
    }
  };
}

// Call OpenAI API
async function callOpenAIAPI(prompt, apiKey, model = 'gpt-4.1') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 300,  // Increased to prevent JSON truncation
      messages: [
        {
          role: 'system',
          content: 'Environmental compliance analyst. Return compact JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse JSON with better error handling
  let parsedResult;
  try {
    // First attempt: parse as-is
    parsedResult = JSON.parse(content);
    console.log('EnviroX: Successfully parsed OpenAI JSON on first attempt');
  } catch (parseError) {
    console.error('EnviroX: OpenAI JSON parse error:', parseError);
    console.error('EnviroX: Problematic content:', content.substring(0, 1000));

    // Second attempt: sanitize and parse
    try {
      const sanitizedJson = sanitizeJSON(content);
      console.log('EnviroX: Attempting to parse sanitized OpenAI JSON');
      parsedResult = JSON.parse(sanitizedJson);
      console.log('EnviroX: Successfully parsed sanitized OpenAI JSON');
    } catch (secondError) {
      console.error('EnviroX: Failed to parse OpenAI response even after sanitization');
      console.error('EnviroX: Sanitized JSON:', sanitizedJson?.substring(0, 1000));
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}. The AI response may be incomplete or malformed.`);
    }
  }

  // Return result with token usage
  return {
    result: parsedResult,
    tokenUsage: {
      input: data.usage.prompt_tokens,
      output: data.usage.completion_tokens,
      total: data.usage.total_tokens
    }
  };
}

// Fetch images from CDN and convert to base64 (bypasses CORS in content scripts)
async function fetchImagesAsBase64(imageUrls) {
  const base64Images = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    console.log(`EnviroX: Fetching image ${i + 1}/${imageUrls.length} from CDN`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`EnviroX: Failed to fetch image: ${response.status}`);
        continue;
      }

      const blob = await response.blob();

      // Convert blob to base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      base64Images.push(base64);
      console.log(`EnviroX: Image ${i + 1} fetched successfully`);
    } catch (error) {
      console.error(`EnviroX: Error fetching image ${i + 1}:`, error);
      // Continue with other images
    }
  }

  console.log(`EnviroX: Successfully fetched ${base64Images.length}/${imageUrls.length} images`);
  return base64Images;
}

// Cache for analyzed products (key: URL hash)
const analysisCache = new Map();

// Generate cache key from URL
function getCacheKey(url) {
  return url.split('?')[0]; // Remove query params
}

// Main analysis function
async function analyzeProduct(productData) {
  const config = await getAPIConfig();

  if (!config.apiKey) {
    throw new Error('No API key configured. Please set your API key in the extension popup.');
  }

  // Check cache first
  const cacheKey = getCacheKey(productData.url);
  if (analysisCache.has(cacheKey)) {
    console.log('EnviroX: Returning cached result');
    return analysisCache.get(cacheKey);
  }

  const prompt = buildPrompt(productData);

  console.log('EnviroX: Calling API with provider:', config.provider, 'model:', config.openaiModel);

  let apiResponse;
  if (config.provider === API_PROVIDERS.ANTHROPIC) {
    apiResponse = await callAnthropicAPI(prompt, config.apiKey);
  } else {
    apiResponse = await callOpenAIAPI(prompt, config.apiKey, config.openaiModel);
  }

  const { result, tokenUsage } = apiResponse;

  // Validate new response structure
  if (!result.hasOwnProperty('status') ||
      !result.hasOwnProperty('greenwashing_detected') ||
      !result.hasOwnProperty('confidence_score') ||
      !result.hasOwnProperty('violated_claims') ||
      !result.hasOwnProperty('supported_claims') ||
      !result.hasOwnProperty('final_assessment')) {
    throw new Error('Invalid API response structure');
  }

  console.log('EnviroX: Token usage -', tokenUsage);
  console.log('EnviroX: Analysis status -', result.status);

  // Convert new format to old format for compatibility with UI
  const convertedResult = {
    is_greenwashed: result.greenwashing_detected,
    confidence: result.confidence_score,
    flags: result.violated_claims.map(v => v.claim + ': ' + v.reason),
    summary: result.final_assessment,
    evidence: result.evidence,
    supported_claims: result.supported_claims,
    certifications: result.certifications
  };

  const responseData = { result: convertedResult, tokenUsage };

  // Cache the result
  analysisCache.set(cacheKey, responseData);

  // Store result in local storage for history
  chrome.storage.local.get(['analysisHistory'], (data) => {
    const history = data.analysisHistory || [];
    history.unshift({
      timestamp: Date.now(),
      url: productData.url,
      title: productData.title,
      result: convertedResult,
      tokenUsage: tokenUsage
    });

    // Keep only last 20 analyses
    chrome.storage.local.set({
      analysisHistory: history.slice(0, 20)
    });
  });

  return responseData;
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchImages') {
    // Fetch images from CDN and return as base64
    fetchImagesAsBase64(request.imageUrls)
      .then(base64Images => {
        sendResponse({ base64Images });
      })
      .catch(error => {
        console.error('EnviroX Image Fetch Error:', error);
        sendResponse({ error: error.message, base64Images: [] });
      });

    // Keep channel open for async response
    return true;
  }

  if (request.action === 'analyzeProduct') {
    analyzeProduct(request.data)
      .then(({ result, tokenUsage }) => {
        sendResponse({ result, tokenUsage });
      })
      .catch(error => {
        console.error('EnviroX Error:', error);
        sendResponse({ error: error.message });
      });

    // Keep channel open for async response
    return true;
  }
});

// Log extension startup
console.log('EnviroX background service worker initialized');
