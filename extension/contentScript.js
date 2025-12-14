// Simple Claude.ai integration: when the user sends a prompt, also mirror it to Quieter.ai
// using the stored Quieter API key. This does NOT interfere with Claude's own behavior;
// it just lets Quieter log usage so it appears on the Dashboard.

console.log('[Quieter] Claude content script loaded');

const STORAGE_KEY = 'quieterApiKey';
const API_BASE = 'https://quieteraiapp-production.up.railway.app';

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

let lastSentText = '';

async function sendToQuieter(promptText) {
  const text = (promptText || '').trim();
  if (!text) return;
  // Avoid spamming the same prompt repeatedly if handlers fire twice
  if (text === lastSentText) return;
  lastSentText = text;

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
        prompt: text,
        metadata: { source: 'claude-web-mirror' },
      }),
    });
  } catch (e) {
    // Fail silently so we never break Claude
    console.error('Quieter mirror failed', e);
  }
}

function getInputElement() {
  // Prefer Claude's main chat input if present
  const claudeInput = document.querySelector('[data-testid="chat-input"].tiptap.ProseMirror[contenteditable="true"]');
  if (claudeInput) return claudeInput;
  // Fallbacks
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
      const text = readInputValue(inputEl);
      sendToQuieter(text);
    }
  });

  // Also try to hook the primary send button, if present
  const sendButton = document.querySelector('button[aria-label="Send message"]');
  if (sendButton && !sendButton.dataset.quieterAttached) {
    sendButton.dataset.quieterAttached = '1';
    sendButton.addEventListener('click', () => {
      const currentInput = getInputElement();
      const text = readInputValue(currentInput);
      sendToQuieter(text);
    });
  }
}

// Try to attach on load and as the DOM changes
attachListeners();
const observer = new MutationObserver(() => {
  attachListeners();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
