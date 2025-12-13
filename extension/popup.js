const STORAGE_KEY = 'quieterApiKey';
const API_BASE = 'https://quieteraiapp-production.up.railway.app';

const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('save');
const testButton = document.getElementById('test');
const statusEl = document.getElementById('status');
const promptInput = document.getElementById('prompt');
const sendButton = document.getElementById('send');
const responseEl = document.getElementById('response');

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = '';
  if (kind) statusEl.classList.add(kind);
}

// Load stored key on open
chrome.storage.sync.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) {
    apiKeyInput.value = result[STORAGE_KEY];
    setStatus('Key loaded from storage.', 'ok');
  }
});

saveButton.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus('Please enter an API key starting with qtr_.', 'err');
    return;
  }
  chrome.storage.sync.set({ [STORAGE_KEY]: key }, () => {
    setStatus('API key saved.', 'ok');
  });
});

async function testConnection() {
  setStatus('Testing connection...', '');
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus('Please enter and save your API key first.', 'err');
    return;
  }

  try {
    const res = await fetch(API_BASE + '/usage', {
      method: 'GET',
      headers: {
        // No auth required for /usage; just testing reachability.
      },
    });

    if (!res.ok) {
      setStatus('API reachable but returned an error (' + res.status + ').', 'err');
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data && data.ok) {
      setStatus('Connected to Quieter.ai. Global requests: ' + data.totalRequests, 'ok');
    } else {
      setStatus('Connected to Quieter.ai, but response was unexpected.', 'err');
    }
  } catch (e) {
    console.error(e);
    setStatus('Could not reach Quieter.ai API. Check your network.', 'err');
  }
}

testButton.addEventListener('click', () => {
  testConnection();
});

async function sendTestPrompt() {
  setStatus('', '');
  responseEl.textContent = '';

  const key = apiKeyInput.value.trim();
  const prompt = (promptInput.value || '').trim();

  if (!key) {
    setStatus('Please enter and save your API key first.', 'err');
    return;
  }
  if (!prompt) {
    setStatus('Enter a prompt to send through Quieter.', 'err');
    return;
  }

  try {
    setStatus('Sending prompt via Quieter...', '');
    const res = await fetch(API_BASE + '/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        prompt,
        metadata: { source: 'browser-extension-test' },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setStatus('Quieter request failed: ' + (data.error || res.status), 'err');
      return;
    }

    responseEl.textContent = data.modelResponse || '(no text response)';
    setStatus('Prompt sent through Quieter successfully.', 'ok');
  } catch (e) {
    console.error(e);
    setStatus('Error sending prompt via Quieter.', 'err');
  }
}

sendButton.addEventListener('click', () => {
  sendTestPrompt();
});
