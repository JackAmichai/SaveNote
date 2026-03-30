/**
 * SaveNote — WhatsApp Web Content Script
 * Native Bot Mode: Hijacks the "Self-Chat" to act as the AI bot.
 */

(function () {
  'use strict';

  // ===== Configuration =====
  const CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📌',
  };

  const CATEGORY_KEYWORDS = {
    parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|חנית|חניתי|חניה|רכב|קומה)\b/i,
    book: /\b(book|read|reading|author|novel|chapter|finished reading|started reading|page|ספר|קראתי|קריאה|לקריאה|סופר)\b/i,
    idea: /\b(idea|thought|maybe|what if|concept|brainstorm|could|should try|רעיון|אולי|מה אם)\b/i,
    reminder: /\b(remind|remember|don'?t forget|todo|task|call|schedule|appointment|meeting|תזכורת|לזכור|פגישה)\b/i,
    shopping: /\b(shop|shopping|buy|groceries|grocery|supermarket|market|shoes|clothes|list|קניות|סופר|לקנות)\b/i,
    location: /\b(location|place|address|street|road|restaurant|cafe|bar|store|found a|מקום|כתובת|מסעדה|רחוב)\b/i,
    person: /\b(met |person|name is|works at|works on|contact|friend|colleague|פגשתי|חבר|עובד ב)\b/i,
    recipe: /\b(recipe|cook|ingredient|food|dish|meal|bake|fry|boil|מתכון|בישול|אוכל)\b/i,
    health: /\b(health|doctor|medicine|medication|symptom|diagnosis|hospital|clinic|vitamin|רופא|בריאות|תרופה)\b/i,
    finance: /\b(money|pay|paid|cost|price|expense|salary|bank|finance|budget|\$|₪|€|£|כסף|שילמתי|עלות|הוצאה)\b/i,
  };

  let notes = [];
  let lastProcessedMessages = new Set();
  const BOT_NAME = 'SaveNote AI 💬';
  const BOT_COLOR = '#008069';

  // SVG for bot avatar
  const BOT_SVG = `<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;

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
    if (!text.trim()) return;
    const category = categorize(text);
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'SAVE_NOTE',
        category,
        summary: text.length > 120 ? text.substring(0, 117) + '...' : text,
        raw_message: text,
        metadata: {},
        attachments: [],
      }, (response) => {
        if (response && response.success) {
          notes.unshift(response.note);
          injectBotReply(`✅ Got it! Saved under <strong>${category}</strong> ${CATEGORY_EMOJI[category]}<br><small>"${text}"</small>`);
          resolve(response.note);
        }
      });
    });
  }

  // ===== Categorization =====
  function categorize(text) {
    for (const [category, regex] of Object.entries(CATEGORY_KEYWORDS)) {
      if (regex.test(text)) return category;
    }
    return 'other';
  }

  // ===== UI: Bot Identity Hijacker =====
  function hijackIdentity() {
    // 1. Rename 'You' in sidebar
    const chatTitles = document.querySelectorAll('[data-testid="contact-name"], [data-testid="cell-frame-container"] span[title]');
    chatTitles.forEach(el => {
      const txt = el.textContent || el.getAttribute('title') || '';
      if (txt === 'You' || txt === '(You)' || txt === 'Chat with yourself') {
        el.textContent = BOT_NAME;
        el.style.color = BOT_COLOR;
        el.style.fontWeight = 'bold';
        
        // Try to replace avatar
        const parent = el.closest('[data-testid="cell-frame-container"]');
        if (parent) {
          const avatar = parent.querySelector('[data-testid="avatar-img-container"]');
          if (avatar && !avatar.dataset.snHijacked) {
            avatar.innerHTML = BOT_SVG;
            avatar.dataset.snHijacked = 'true';
          }
        }
      }
    });

    // 2. Rename in active conversation header
    const headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
    if (headerTitle) {
      const txt = headerTitle.textContent;
      if (txt === 'You' || txt === '(You)' || txt === 'Chat with yourself' || txt.includes('SaveNote')) {
        headerTitle.textContent = BOT_NAME;
        
        const header = headerTitle.closest('header');
        if (header) {
          const avatar = header.querySelector('[data-testid="avatar-img-container"]');
          if (avatar && !avatar.dataset.snHijacked) {
            avatar.innerHTML = BOT_SVG;
            avatar.dataset.snHijacked = 'true';
          }
        }
      }
    }
  }

  // ===== UI: Bot Reply Injector =====
  function injectBotReply(html) {
    const chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || 
                     document.querySelector('.copyable-area [role="application"]');
    if (!chatPane) return;

    const replyContainer = document.createElement('div');
    replyContainer.className = 'sn-bot-reply-container';
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    replyContainer.innerHTML = `
      <div class="sn-bot-bubble">
        <div class="sn-bot-header">${BOT_NAME}</div>
        <div class="sn-bot-content">${html}</div>
        <div class="sn-bot-time">${now}</div>
      </div>
    `;

    chatPane.appendChild(replyContainer);
    
    // Scroll to bottom
    chatPane.scrollTop = chatPane.scrollHeight;
  }

  // ===== Command Handler =====
  function handleCommand(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes('what') && lower.includes('book')) {
      const books = notes.filter(n => n.category === 'book');
      if (books.length === 0) {
        injectBotReply("📚 You haven't saved any books yet! Just send me a book title to start your list.");
      } else {
        const list = books.slice(0, 5).map(b => `• ${b.summary}`).join('<br>');
        injectBotReply(`📚 <strong>Here are the last few books you read:</strong><br>${list}`);
      }
      return true;
    }
    
    if (lower.includes('where') && lower.includes('park')) {
      const parking = notes.find(n => n.category === 'parking');
      if (!parking) {
        injectBotReply("🅿️ I don't have any recent parking notes. Don't forget to tell me where you park next time!");
      } else {
        injectBotReply(`🅿️ <strong>Last parking spot found:</strong><br>"${parking.raw_message}"<br><small>Saved ${new Date(parking.created_at).toLocaleTimeString()}</small>`);
      }
      return true;
    }

    if (lower.includes('what') && lower.includes('shopping')) {
        const shopping = notes.filter(n => n.category === 'shopping');
        if (shopping.length === 0) {
          injectBotReply("🛒 Your shopping list is empty.");
        } else {
          const list = shopping.map(s => `• ${s.summary}`).join('<br>');
          injectBotReply(`🛒 <strong>Your shopping list:</strong><br>${list}`);
        }
        return true;
      }

    if (lower.includes('help') || lower.includes('hello') || lower.includes('hi ')) {
      injectBotReply(`👋 <strong>Hi! I'm SaveNote AI.</strong><br>I'm your personal memory assistant. Just message me anything you want to remember, and I'll categorize it for you!<br><br>Try asking:<br>• "What books did I read?"<br>• "Where did I park?"<br>• "What's on my shopping list?"`);
      return true;
    }

    return false;
  }

  // ===== WhatsApp Web Message Observer =====
  function startObservers() {
    // 1. Identity Hijacker Interval
    setInterval(hijackIdentity, 2000);

    // 2. Message Mutation Observer
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
    const msgContainers = el.querySelectorAll ? [
      ...el.querySelectorAll('[data-testid="msg-container"]'),
      ...(el.matches && el.matches('[data-testid="msg-container"]') ? [el] : []),
    ] : [];

    for (const container of msgContainers) {
      const isOutgoing = container.querySelector('[data-testid="msg-dblcheck"]') ||
                         container.querySelector('[data-testid="msg-check"]') ||
                         container.classList.contains('message-out');

      if (!isOutgoing) continue;

      const textEl = container.querySelector('.selectable-text span') ||
                     container.querySelector('[data-testid="msg-text"] span');
      if (!textEl) continue;

      const text = textEl.textContent.trim();
      if (!text || text.length < 2) continue;

      if (lastProcessedMessages.has(text)) continue;
      lastProcessedMessages.add(text);

      checkSelfChat().then((isSelf) => {
        if (isSelf) {
          if (!handleCommand(text)) {
            saveNote(text);
          }
        }
      });
    }
  }

  async function checkSelfChat() {
    const header = document.querySelector('[data-testid="conversation-header"]') || document.querySelector('header');
    if (!header) return false;

    const titleEl = header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
                    header.querySelector('span[title]');
    if (!titleEl) return false;

    const title = titleEl.textContent || titleEl.getAttribute('title') || '';
    return title.includes('SaveNote') || title.includes('(You)') || title.includes('You');
  }

  // ===== Initialize =====
  function init() {
    console.log('🤖 SaveNote Native Bot Mode activated');
    loadNotes().then(() => {
      startObservers();
    });
  }

  // Wait for DOM
  if (document.readyState === 'complete') {
    setTimeout(init, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 2000));
  }
})();
