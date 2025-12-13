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

function attachListeners() {
  // Claude UI changes frequently; this is a heuristic that looks for a textarea
  // in the main chat area and hooks the Enter key.
  const textarea = document.querySelector('textarea');
  if (!textarea) return;

  if (textarea.dataset.quieterAttached === '1') return;
  textarea.dataset.quieterAttached = '1';

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const text = textarea.value.trim();
      if (text) {
        // Fire-and-forget mirror; do not block Claude's own handler
        sendToQuieter(text);
      }
    }
  });
}

// Try to attach on load and when the DOM changes a bit
attachListeners();
const observer = new MutationObserver(() => {
  attachListeners();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
