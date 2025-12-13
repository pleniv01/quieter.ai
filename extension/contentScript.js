// Simple Claude.ai integration: when the user sends a prompt, also mirror it to Quieter.ai
// using the stored Quieter API key. This does NOT interfere with Claude's own behavior;
// it just lets Quieter log usage so it appears on the Dashboard.

const STORAGE_KEY = 'quieterApiKey';
const API_BASE = 'https://quieteraiapp-production.up.railway.app';

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

async function sendToQuieter(promptText) {
  try {
    const key = await getApiKey();
    if (!key) return;

    await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt: promptText,
        metadata: { source: 'claude-web-mirror' },
      }),
    });
  } catch (e) {
    // Fail silently so we never break Claude
    console.error('Quieter mirror failed', e);
  }
}

function getInputElement() {
  // Claude frequently uses either a textarea or a contenteditable div for the input box.
  const textarea = document.querySelector('textarea');
  if (textarea) return textarea;
  const editable = document.querySelector('[contenteditable="true"]');
  return editable || null;
}

function readInputValue(el) {
  if (!el) return '';
  if (el.tagName === 'TEXTAREA') return el.value || '';
  return el.innerText || el.textContent || '';
}

function attachListeners() {
  const inputEl = getInputElement();
  if (!inputEl) return;

  if (inputEl.dataset.quieterAttached === '1') return;
  inputEl.dataset.quieterAttached = '1';

  // Mirror on Enter in the input element
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const text = readInputValue(inputEl).trim();
      if (text) {
        sendToQuieter(text);
      }
    }
  });

  // Also try to hook the primary send button, if present
  const sendButton = document.querySelector('button[type="submit"], button[aria-label*="Send" i]');
  if (sendButton && !sendButton.dataset.quieterAttached) {
    sendButton.dataset.quieterAttached = '1';
    sendButton.addEventListener('click', () => {
      const text = readInputValue(getInputElement()).trim();
      if (text) {
        sendToQuieter(text);
      }
    });
  }
}

// Try to attach on load and as the DOM changes
attachListeners();
const observer = new MutationObserver(() => {
  attachListeners();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
