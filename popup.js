// EnviroX Popup Script - Settings Management

const API_LINKS = {
  anthropic: 'https://console.anthropic.com/',
  openai: 'https://platform.openai.com/api-keys'
};

// DOM Elements
const statusMessage = document.getElementById('statusMessage');
const radioOptions = document.querySelectorAll('.radio-option');
const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const apiLink = document.getElementById('apiLink');
const modelSection = document.getElementById('modelSection');
const modelSelect = document.getElementById('modelSelect');

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get(['apiProvider', 'apiKey', 'openaiModel'], (result) => {
    const provider = result.apiProvider || 'anthropic';
    const apiKey = result.apiKey || '';
    const openaiModel = result.openaiModel || 'gpt-4.1';

    // Set provider
    const radioInput = document.getElementById(provider);
    if (radioInput) {
      radioInput.checked = true;
      updateSelectedProvider(provider);
    }

    // Set API key
    apiKeyInput.value = apiKey;

    // Set OpenAI model
    modelSelect.value = openaiModel;

    console.log('EnviroX: Loaded settings', { provider, hasKey: !!apiKey, model: openaiModel });
  });
}

// Update selected provider visual state
function updateSelectedProvider(provider) {
  radioOptions.forEach(option => {
    if (option.dataset.provider === provider) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });

  // Update help link
  apiLink.href = API_LINKS[provider];
  const linkText = provider === 'anthropic' ? 'console.anthropic.com' : 'platform.openai.com';
  apiLink.textContent = linkText;

  // Show/hide model selector for OpenAI
  if (provider === 'openai') {
    modelSection.style.display = 'block';
  } else {
    modelSection.style.display = 'none';
  }
}

// Show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} show`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// Save settings
function saveSettings() {
  const selectedProvider = document.querySelector('input[name="provider"]:checked');
  const apiKey = apiKeyInput.value.trim();

  if (!selectedProvider) {
    showStatus('Please select an AI provider', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  // Validate API key format
  const provider = selectedProvider.value;
  if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    showStatus('Invalid Anthropic API key format (should start with sk-ant-)', 'error');
    return;
  }

  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    showStatus('Invalid OpenAI API key format (should start with sk-)', 'error');
    return;
  }

  // Get selected OpenAI model if provider is OpenAI
  const openaiModel = provider === 'openai' ? modelSelect.value : 'gpt-4.1';

  // Save to chrome.storage
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  chrome.storage.sync.set({
    apiProvider: provider,
    apiKey: apiKey,
    openaiModel: openaiModel
  }, () => {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';

    if (chrome.runtime.lastError) {
      showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('Settings saved successfully!', 'success');
      console.log('EnviroX: Settings saved', { provider, keyLength: apiKey.length, model: openaiModel });
    }
  });
}

// Event Listeners
radioOptions.forEach(option => {
  option.addEventListener('click', () => {
    const provider = option.dataset.provider;
    const radioInput = option.querySelector('input[type="radio"]');
    radioInput.checked = true;
    updateSelectedProvider(provider);
  });
});

document.querySelectorAll('input[name="provider"]').forEach(input => {
  input.addEventListener('change', (e) => {
    updateSelectedProvider(e.target.value);
  });
});

saveBtn.addEventListener('click', saveSettings);

// Allow Enter key to save
apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveSettings();
  }
});

// Initialize
loadSettings();
