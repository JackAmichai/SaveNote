/**
 * SaveNote — WhatsApp Web Content Script
 * Injects the SaveNote sidebar into WhatsApp Web and monitors messages
 */

(function () {
  'use strict';

  // ===== Configuration =====
  const CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', other: '📌',
  };

  const CATEGORY_KEYWORDS = {
    parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot)\b/i,
    book: /\b(book|read|reading|author|novel|chapter|finished reading|started reading|page)\b/i,
    idea: /\b(idea|thought|maybe|what if|concept|brainstorm|could|should try)\b/i,
    reminder: /\b(remind|remember|don'?t forget|todo|task|buy|call|schedule|appointment|meeting)\b/i,
    location: /\b(location|place|address|street|road|restaurant|cafe|bar|shop|store|found a)\b/i,
    person: /\b(met |person|name is|works at|works on|contact|friend|colleague)\b/i,
    recipe: /\b(recipe|cook|ingredient|food|dish|meal|bake|fry|boil)\b/i,
    health: /\b(health|doctor|medicine|medication|symptom|diagnosis|hospital|clinic|vitamin)\b/i,
    finance: /\b(money|pay|paid|cost|price|expense|salary|bank|finance|budget|\$|₪|€|£)\b/i,
  };

  let panelOpen = false;
  let notes = [];
  let activeFilter = '';
  let searchQuery = '';
  let lastProcessedMessages = new Set();

  // ===== Categorization =====
  function categorize(text) {
    for (const [category, regex] of Object.entries(CATEGORY_KEYWORDS)) {
      if (regex.test(text)) return category;
    }
    return 'other';
  }

  function extractMetadata(text, category) {
    const meta = {};
    switch (category) {
      case 'parking':
        const level = text.match(/level\s*(\d+)/i) || text.match(/floor\s*(\d+)/i);
        const section = text.match(/section\s*([A-Za-z0-9]+)/i);
        if (level) meta.level = level[1];
        if (section) meta.section = section[1];
        break;
      case 'book':
        const byMatch = text.match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        if (byMatch) meta.author = byMatch[1];
        break;
      case 'finance':
        const amount = text.match(/[\$₪€£]\s*[\d,]+(?:\.\d{2})?/) || text.match(/(\d[\d,]+)\s*(?:NIS|USD|EUR)/i);
        if (amount) meta.amount = amount[0];
        break;
      case 'person':
        const nameMatch = text.match(/(?:met|name is)\s+([A-Z][a-z]+)/);
        if (nameMatch) meta.name = nameMatch[1];
        break;
    }
    return meta;
  }

  // ===== Storage =====
  async function loadNotes() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['notes'], (data) => {
        notes = data.notes || [];
        resolve(notes);
      });
    });
  }

  async function saveNote(text) {
    const category = categorize(text);
    const metadata = extractMetadata(text, category);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'SAVE_NOTE',
        category,
        summary: text.length > 120 ? text.substring(0, 117) + '...' : text,
        raw_message: text,
        metadata,
      }, (response) => {
        if (response && response.success) {
          notes.unshift(response.note);
          renderNotes();
          showToast(`${CATEGORY_EMOJI[category]} Saved under ${category}`);
          resolve(response.note);
        }
      });
    });
  }

  async function deleteNote(id) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'DELETE_NOTE', id }, () => {
        notes = notes.filter((n) => n.id !== id);
        renderNotes();
        resolve();
      });
    });
  }

  // ===== Toast Notification =====
  function showToast(message) {
    let toast = document.getElementById('sn-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sn-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('sn-toast-show');
    setTimeout(() => toast.classList.remove('sn-toast-show'), 2500);
  }

  // ===== UI: Floating Button =====
  function createFloatingButton() {
    if (document.getElementById('sn-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'sn-fab';
    fab.title = 'SaveNote';
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        <path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/>
      </svg>
      <div id="sn-fab-badge" class="sn-fab-badge" style="display:none;">0</div>
    `;
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);
  }

  // ===== UI: Side Panel =====
  function createPanel() {
    if (document.getElementById('sn-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'sn-panel';
    panel.innerHTML = `
      <div class="sn-panel-header">
        <div class="sn-panel-title">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#008069">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <span>SaveNote</span>
        </div>
        <div class="sn-panel-actions">
          <button id="sn-add-btn" class="sn-icon-btn" title="Add note">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
          <button id="sn-close-btn" class="sn-icon-btn" title="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>

      <div class="sn-search-bar">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#8696A0"><circle cx="11" cy="11" r="8" fill="none" stroke="#8696A0" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#8696A0" stroke-width="2"/></svg>
        <input type="text" id="sn-search" placeholder="Search notes..." autocomplete="off">
      </div>

      <div class="sn-filters" id="sn-filters">
        <button class="sn-filter-btn active" data-cat="">All</button>
      </div>

      <div class="sn-notes-list" id="sn-notes-list">
        <div class="sn-empty">
          <div class="sn-empty-icon">📝</div>
          <p>No notes yet.<br>Send messages to yourself to save them!</p>
        </div>
      </div>

      <div class="sn-add-panel" id="sn-add-panel" style="display:none;">
        <textarea id="sn-note-input" placeholder="Type something to remember..." rows="3"></textarea>
        <div class="sn-add-actions">
          <button id="sn-cancel-add" class="sn-btn sn-btn-cancel">Cancel</button>
          <button id="sn-save-add" class="sn-btn sn-btn-save">Save Note</button>
        </div>
      </div>

      <div class="sn-panel-footer">
        <span>Messages you send to yourself are auto-saved</span>
      </div>
    `;

    document.body.appendChild(panel);

    // Wire up events
    document.getElementById('sn-close-btn').addEventListener('click', togglePanel);
    document.getElementById('sn-add-btn').addEventListener('click', () => {
      const addPanel = document.getElementById('sn-add-panel');
      addPanel.style.display = addPanel.style.display === 'none' ? 'flex' : 'none';
      if (addPanel.style.display === 'flex') {
        document.getElementById('sn-note-input').focus();
      }
    });

    document.getElementById('sn-cancel-add').addEventListener('click', () => {
      document.getElementById('sn-add-panel').style.display = 'none';
      document.getElementById('sn-note-input').value = '';
    });

    document.getElementById('sn-save-add').addEventListener('click', async () => {
      const input = document.getElementById('sn-note-input');
      const text = input.value.trim();
      if (!text) return;
      await saveNote(text);
      input.value = '';
      document.getElementById('sn-add-panel').style.display = 'none';
    });

    document.getElementById('sn-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderNotes();
    });

    // Handle Enter key in textarea
    document.getElementById('sn-note-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('sn-save-add').click();
      }
    });
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    const panel = document.getElementById('sn-panel');
    const fab = document.getElementById('sn-fab');

    if (panelOpen) {
      panel.classList.add('sn-panel-open');
      fab.classList.add('sn-fab-hidden');
      loadNotes().then(() => renderNotes());
    } else {
      panel.classList.remove('sn-panel-open');
      fab.classList.remove('sn-fab-hidden');
    }
  }

  // ===== Rendering =====
  function renderNotes() {
    const list = document.getElementById('sn-notes-list');
    if (!list) return;

    // Filter
    let filtered = [...notes];
    if (activeFilter) {
      filtered = filtered.filter((n) => n.category === activeFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter((n) =>
        n.summary.toLowerCase().includes(searchQuery) ||
        (n.raw_message && n.raw_message.toLowerCase().includes(searchQuery)) ||
        n.category.toLowerCase().includes(searchQuery)
      );
    }

    // Render filters
    renderFilters();

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="sn-empty">
          <div class="sn-empty-icon">${searchQuery ? '🔍' : '📝'}</div>
          <p>${searchQuery ? 'No notes match your search.' : 'No notes yet.<br>Send messages to yourself to save them!'}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map((note) => {
        const emoji = CATEGORY_EMOJI[note.category] || '📌';
        const date = new Date(note.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        const meta = note.metadata || {};
        const metaStr = Object.entries(meta)
          .filter(([, v]) => v && typeof v === 'string' && v.length < 50)
          .map(([k, v]) => `<span class="sn-meta-tag"><b>${k}:</b> ${v}</span>`)
          .join('');

        return `
          <div class="sn-note-card" data-id="${note.id}">
            <div class="sn-note-top">
              <span class="sn-note-cat sn-cat-${note.category}">${emoji} ${note.category}</span>
              <button class="sn-note-del" data-id="${note.id}" title="Delete">✕</button>
            </div>
            <div class="sn-note-text">${escapeHtml(note.summary)}</div>
            ${metaStr ? `<div class="sn-note-meta">${metaStr}</div>` : ''}
            <div class="sn-note-date">${date}</div>
          </div>
        `;
      })
      .join('');

    // Delete buttons
    list.querySelectorAll('.sn-note-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        deleteNote(id);
      });
    });
  }

  function renderFilters() {
    const container = document.getElementById('sn-filters');
    if (!container) return;

    const categories = [...new Set(notes.map((n) => n.category))].sort();
    const allBtn = `<button class="sn-filter-btn${activeFilter === '' ? ' active' : ''}" data-cat="">All (${notes.length})</button>`;
    const catBtns = categories
      .map((cat) => {
        const count = notes.filter((n) => n.category === cat).length;
        const emoji = CATEGORY_EMOJI[cat] || '📌';
        return `<button class="sn-filter-btn${activeFilter === cat ? ' active' : ''}" data-cat="${cat}">${emoji} ${count}</button>`;
      })
      .join('');

    container.innerHTML = allBtn + catBtns;

    container.querySelectorAll('.sn-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.cat;
        container.querySelectorAll('.sn-filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderNotes();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ===== WhatsApp Web Message Observer =====
  function startMessageObserver() {
    // Wait for WhatsApp to fully load
    const checkReady = setInterval(() => {
      const appEl = document.querySelector('#app');
      const mainPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]') ||
                        document.querySelector('#main');
      if (appEl && mainPanel) {
        clearInterval(checkReady);
        observeMessages();
      }
    }, 2000);
  }

  function observeMessages() {
    // Observe the entire app for DOM changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          processNewElements(node);
        }
      }
    });

    const app = document.querySelector('#app');
    if (app) {
      observer.observe(app, { childList: true, subtree: true });
    }
  }

  function processNewElements(el) {
    // Look for outgoing message bubbles
    const msgContainers = el.querySelectorAll
      ? [
          ...el.querySelectorAll('[data-testid="msg-container"]'),
          ...(el.matches && el.matches('[data-testid="msg-container"]') ? [el] : []),
        ]
      : [];

    for (const container of msgContainers) {
      // Check if this is an outgoing (sent) message
      const isOutgoing = container.querySelector('[data-testid="msg-dblcheck"]') ||
                         container.querySelector('[data-testid="msg-check"]') ||
                         container.classList.contains('message-out');

      if (!isOutgoing) continue;

      // Get message text
      const textEl = container.querySelector('.selectable-text span') ||
                     container.querySelector('[data-testid="msg-text"] span');
      if (!textEl) continue;

      const text = textEl.textContent.trim();
      if (!text || text.length < 3) continue;

      // Deduplicate
      const msgKey = `${text}-${Date.now() >> 12}`; // group by ~4s window
      if (lastProcessedMessages.has(text)) continue;
      lastProcessedMessages.add(text);

      // Limit cache size
      if (lastProcessedMessages.size > 200) {
        const arr = [...lastProcessedMessages];
        lastProcessedMessages = new Set(arr.slice(-100));
      }

      // Check if we're in a self-chat by checking the header
      checkSelfChat().then((isSelf) => {
        if (isSelf) {
          saveNote(text);
          updateBadge();
        }
      });
    }
  }

  async function checkSelfChat() {
    // Try to detect if current chat is a self-chat
    // WhatsApp Web shows "You" or the user's own name in self-chats
    const header = document.querySelector('[data-testid="conversation-header"]') ||
                   document.querySelector('header');
    if (!header) return false;

    // Self-chat often has "(You)" or the user's own name
    const titleEl = header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
                    header.querySelector('span[title]');
    if (!titleEl) return false;

    const title = titleEl.textContent || titleEl.getAttribute('title') || '';
    // Check common self-chat indicators
    return title.includes('(You)') || title.includes('You') || title === 'Chat with yourself';
  }

  function updateBadge() {
    const badge = document.getElementById('sn-fab-badge');
    if (badge && !panelOpen) {
      const count = parseInt(badge.textContent || '0') + 1;
      badge.textContent = count;
      badge.style.display = 'flex';
    }
  }

  // ===== Initialize =====
  function init() {
    console.log('📝 SaveNote extension loaded on WhatsApp Web');
    createFloatingButton();
    createPanel();
    loadNotes().then(() => {
      renderNotes();
      startMessageObserver();
    });
  }

  // Wait for DOM
  if (document.readyState === 'complete') {
    setTimeout(init, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1500));
  }
})();
