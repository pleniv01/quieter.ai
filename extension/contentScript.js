// Simple Claude.ai integration: when the user sends a prompt, also mirror it to Quieter.ai
// using the stored Quieter API key. This does NOT interfere with Claude's own behavior;
// it just lets Quieter log usage so it appears on the Dashboard.

console.log('[Quieter] Claude content script loaded');

const STORAGE_KEY = 'quieterApiKey';
const REWRITE_MODE_KEY = 'quieterRewriteMode';
const SCRUB_MODE_KEY = 'quieterScrubMode';
const MODEL_FAMILY_KEY = 'quieterModelFamily';
const MODEL_FALLBACK_KEY = 'quieterModelFallback';
const API_BASE = 'https://quieteraiapp-production.up.railway.app';
const UI_STYLE_ID = 'quieter-ui-style';
const UI_BUTTON_ID = 'quieter-use-button';
const UI_MODAL_ID = 'quieter-use-modal';

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

let lastSentText = '';
let rewriteModeEnabled = false;
let defaultScrubMode = 'strict';
let defaultModelFamily = 'auto';
let defaultModelFallback = false;

function loadRewriteMode() {
  chrome.storage.sync.get([REWRITE_MODE_KEY], (result) => {
    rewriteModeEnabled = Boolean(result[REWRITE_MODE_KEY]);
  });
}

function loadDefaults() {
  chrome.storage.sync.get([SCRUB_MODE_KEY, MODEL_FAMILY_KEY, MODEL_FALLBACK_KEY], (result) => {
    defaultScrubMode = result[SCRUB_MODE_KEY] || 'strict';
    defaultModelFamily = result[MODEL_FAMILY_KEY] || 'auto';
    defaultModelFallback = Boolean(result[MODEL_FALLBACK_KEY]);
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (changes[REWRITE_MODE_KEY]) {
    rewriteModeEnabled = Boolean(changes[REWRITE_MODE_KEY].newValue);
  }
  if (changes[SCRUB_MODE_KEY]) {
    defaultScrubMode = changes[SCRUB_MODE_KEY].newValue || 'strict';
  }
  if (changes[MODEL_FAMILY_KEY]) {
    defaultModelFamily = changes[MODEL_FAMILY_KEY].newValue || 'auto';
  }
  if (changes[MODEL_FALLBACK_KEY]) {
    defaultModelFallback = Boolean(changes[MODEL_FALLBACK_KEY].newValue);
  }
});

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

async function queryQuieter(promptText, options = {}) {
  const text = (promptText || '').trim();
  if (!text) {
    return { ok: false, error: 'Enter a prompt first.' };
  }

  const scrubMode = options.scrubMode || defaultScrubMode;
  const modelFamily = options.modelFamily || defaultModelFamily;
  const modelFallback = options.modelFallback ?? defaultModelFallback;

  const key = await getApiKey();
  if (!key) {
    return { ok: false, error: 'No API key saved. Open the extension popup to add it.' };
  }

  const body = {
    prompt: text,
    metadata: { source: options.source || 'claude-navbar' },
  };
  if (scrubMode) body.scrub_mode = scrubMode;
  if (modelFamily && modelFamily !== 'auto') body.model_family = modelFamily;
  if (modelFallback) body.model_fallback = true;

  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `Request failed (${res.status})` };
    }
    return { ok: true, response: data.modelResponse || '', modelInfo: data.modelInfo || null };
  } catch (e) {
    console.error('Quieter request failed', e);
    return { ok: false, error: 'Network error while calling Quieter.' };
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

function setInputValue(el, value) {
  if (!el) return;
  if (el.tagName === 'TEXTAREA') {
    el.value = value;
  } else {
    el.innerText = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
}

function ensureUiStyles() {
  if (document.getElementById(UI_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = UI_STYLE_ID;
  style.textContent = `
    #${UI_BUTTON_ID} {
      margin-left: 8px;
      padding: 6px 10px;
      font-size: 12px;
      border-radius: 8px;
      border: 1px solid #c9c9c9;
      background: #f7f7f7;
      cursor: pointer;
    }
    #${UI_BUTTON_ID}:hover { background: #ededed; }
    #${UI_MODAL_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    }
    #${UI_MODAL_ID} .quieter-panel {
      width: min(680px, 92vw);
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #ddd;
      padding: 16px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    #${UI_MODAL_ID} .quieter-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #${UI_MODAL_ID} textarea {
      width: 100%;
      min-height: 140px;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #ccc;
      resize: vertical;
      font-size: 13px;
    }
    #${UI_MODAL_ID} .quieter-response {
      white-space: pre-wrap;
      background: #f8f8f8;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 10px;
      max-height: 260px;
      overflow: auto;
      font-size: 13px;
      color: #111;
    }
    #${UI_MODAL_ID} .quieter-status {
      font-size: 12px;
      color: #666;
    }
    #${UI_MODAL_ID} button {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid #c9c9c9;
      background: #f7f7f7;
      cursor: pointer;
      font-size: 12px;
      color: #111;
    }
    #${UI_MODAL_ID} button.primary {
      background: #111;
      color: #fff;
      border-color: #111;
    }
  `;
  document.head.appendChild(style);
}

function findNavbarHost() {
  return (
    document.querySelector('header') ||
    document.querySelector('[data-testid="top-nav"]') ||
    document.querySelector('nav')
  );
}

function ensureUseQuieterUi() {
  ensureUiStyles();
  if (!document.getElementById(UI_MODAL_ID)) {
    const modal = document.createElement('div');
    modal.id = UI_MODAL_ID;
    modal.innerHTML = `
      <div class="quieter-panel" role="dialog" aria-label="Use Quieter">
        <div class="quieter-row" style="justify-content: space-between; align-items: center;">
          <strong>Use Quieter</strong>
          <button type="button" data-quieter-close>Close</button>
        </div>
        <div class="quieter-row">
          <label style="font-size: 12px;">
            Scrub mode
            <select data-quieter-scrub style="margin-left: 6px;">
              <option value="strict">Strict</option>
              <option value="light">Light</option>
              <option value="off">Off</option>
            </select>
          </label>
          <label style="font-size: 12px;">
            Model family
            <select data-quieter-family style="margin-left: 6px;">
              <option value="auto">Auto</option>
              <option value="haiku">Haiku</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
            </select>
          </label>
          <label style="font-size: 12px;">
            <input type="checkbox" data-quieter-fallback />
            Try next model if unavailable
          </label>
        </div>
        <textarea placeholder="Write your prompt to send through Quieter..."></textarea>
        <div class="quieter-row">
          <button type="button" class="primary" data-quieter-send>Send via Quieter</button>
          <button type="button" data-quieter-insert>Insert response into Claude</button>
        </div>
        <div class="quieter-status" data-quieter-status></div>
        <div class="quieter-status" data-quieter-model-used></div>
        <div class="quieter-response" data-quieter-response>(Response will appear here.)</div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('[data-quieter-close]');
    const sendBtn = modal.querySelector('[data-quieter-send]');
    const insertBtn = modal.querySelector('[data-quieter-insert]');
    const statusEl = modal.querySelector('[data-quieter-status]');
    const responseEl = modal.querySelector('[data-quieter-response]');
    const textarea = modal.querySelector('textarea');
    const scrubSelect = modal.querySelector('[data-quieter-scrub]');
    const familySelect = modal.querySelector('[data-quieter-family]');
    const fallbackToggle = modal.querySelector('[data-quieter-fallback]');
    const modelUsedEl = modal.querySelector('[data-quieter-model-used]');

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    sendBtn.addEventListener('click', async () => {
      statusEl.textContent = 'Sending...';
      responseEl.textContent = '';
      if (modelUsedEl) modelUsedEl.textContent = '';
      const result = await queryQuieter(textarea.value, {
        source: 'claude-navbar',
        scrubMode: scrubSelect?.value || defaultScrubMode,
        modelFamily: familySelect?.value || defaultModelFamily,
        modelFallback: fallbackToggle?.checked ?? defaultModelFallback,
      });
      if (!result.ok) {
        statusEl.textContent = result.error;
        return;
      }
      statusEl.textContent = 'Response received.';
      responseEl.textContent = result.response || '(no response text)';
      if (modelUsedEl && result.modelInfo?.displayName) {
        modelUsedEl.textContent = `Model used: ${result.modelInfo.displayName}`;
      }
    });

    insertBtn.addEventListener('click', () => {
      const inputEl = getInputElement();
      const responseText = responseEl.textContent || '';
      if (!inputEl) {
        statusEl.textContent = 'Claude input not found.';
        return;
      }
      if (!responseText || responseText === '(Response will appear here.)') {
        statusEl.textContent = 'No response to insert yet.';
        return;
      }
      setInputValue(inputEl, responseText);
      statusEl.textContent = 'Inserted into Claude input.';
    });

    scrubSelect?.addEventListener('change', () => {
      const value = scrubSelect.value || 'strict';
      chrome.storage.sync.set({ [SCRUB_MODE_KEY]: value });
      defaultScrubMode = value;
    });
    familySelect?.addEventListener('change', () => {
      const value = familySelect.value || 'auto';
      chrome.storage.sync.set({ [MODEL_FAMILY_KEY]: value });
      defaultModelFamily = value;
    });
    fallbackToggle?.addEventListener('change', () => {
      const value = Boolean(fallbackToggle.checked);
      chrome.storage.sync.set({ [MODEL_FALLBACK_KEY]: value });
      defaultModelFallback = value;
    });
  }

  if (!document.getElementById(UI_BUTTON_ID)) {
    const host = findNavbarHost() || document.body;
    const button = document.createElement('button');
    button.id = UI_BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Use Quieter';
    button.addEventListener('click', () => {
      const modal = document.getElementById(UI_MODAL_ID);
      if (modal) modal.style.display = 'flex';
    });
    host.appendChild(button);
  }
}

function getModalElements() {
  const modal = document.getElementById(UI_MODAL_ID);
  if (!modal) return null;
  return {
    modal,
    textarea: modal.querySelector('textarea'),
    statusEl: modal.querySelector('[data-quieter-status]'),
    responseEl: modal.querySelector('[data-quieter-response]'),
  };
}

function openQuieterModal(promptText) {
  ensureUseQuieterUi();
  const elements = getModalElements();
  if (!elements) return null;
  elements.modal.style.display = 'flex';
  if (promptText && elements.textarea) {
    elements.textarea.value = promptText;
  }
  const scrubSelect = elements.modal.querySelector('[data-quieter-scrub]');
  const familySelect = elements.modal.querySelector('[data-quieter-family]');
  const fallbackToggle = elements.modal.querySelector('[data-quieter-fallback]');
  const modelUsedEl = elements.modal.querySelector('[data-quieter-model-used]');
  if (scrubSelect) scrubSelect.value = defaultScrubMode;
  if (familySelect) familySelect.value = defaultModelFamily;
  if (fallbackToggle) fallbackToggle.checked = defaultModelFallback;
  if (modelUsedEl) modelUsedEl.textContent = '';
  return elements;
}

async function handleRewrite(promptText) {
  const elements = openQuieterModal(promptText);
  if (!elements) return;
  if (elements.statusEl) elements.statusEl.textContent = 'Sending via Quieter...';
  if (elements.responseEl) elements.responseEl.textContent = '';

  const scrubSelect = elements.modal.querySelector('[data-quieter-scrub]');
  const familySelect = elements.modal.querySelector('[data-quieter-family]');
  const fallbackToggle = elements.modal.querySelector('[data-quieter-fallback]');
  const modelUsedEl = elements.modal.querySelector('[data-quieter-model-used]');
  const result = await queryQuieter(promptText, {
    source: 'claude-rewrite',
    scrubMode: scrubSelect?.value || defaultScrubMode,
    modelFamily: familySelect?.value || defaultModelFamily,
    modelFallback: fallbackToggle?.checked ?? defaultModelFallback,
  });
  if (!result.ok) {
    if (elements.statusEl) elements.statusEl.textContent = result.error || 'Request failed.';
    return;
  }

  if (elements.statusEl) elements.statusEl.textContent = 'Response received.';
  if (elements.responseEl) {
    elements.responseEl.textContent = result.response || '(no response text)';
  }
  if (modelUsedEl && result.modelInfo?.displayName) {
    modelUsedEl.textContent = `Model used: ${result.modelInfo.displayName}`;
  }
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
      if (rewriteModeEnabled) {
        e.preventDefault();
        e.stopPropagation();
        handleRewrite(text);
        return;
      }
      sendToQuieter(text);
    }
  });

  // Also try to hook the primary send button, if present
  const sendButton = document.querySelector('button[aria-label="Send message"]');
  if (sendButton && !sendButton.dataset.quieterAttached) {
    sendButton.dataset.quieterAttached = '1';
    sendButton.addEventListener('click', (e) => {
      const currentInput = getInputElement();
      const text = readInputValue(currentInput);
      if (rewriteModeEnabled) {
        e.preventDefault();
        e.stopPropagation();
        handleRewrite(text);
        return;
      }
      sendToQuieter(text);
    });
  }
}

// Try to attach on load and as the DOM changes
attachListeners();
ensureUseQuieterUi();
loadRewriteMode();
loadDefaults();
const observer = new MutationObserver(() => {
  attachListeners();
  ensureUseQuieterUi();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
