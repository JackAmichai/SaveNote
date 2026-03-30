/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Hijacks the "Self-Chat" to act as the AI bot.
 * No extensions, no install.
 */

(function () {
  'use strict';

  // ===== Configuration =====
  var CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📌',
  };

  var CATEGORY_KEYWORDS = {
    parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|חנית|חניתי|חניה|רכב|קומה)\b/i,
    book: /\b(book|read|reading|author|novel|chapter|finished|started|ספר|קראתי|קריאה|לקריאה|סופר)\b/i,
    idea: /\b(idea|thought|maybe|what if|concept|brainstorm|should try|רעיון|אולי|מה אם)\b/i,
    reminder: /\b(remind|remember|don't forget|todo|task|buy|call|schedule|תזכורת|לזכור|לקנות|פגישה)\b/i,
    location: /\b(place|address|street|restaurant|cafe|bar|shop|found a|מקום|כתובת|מסעדה|רחוב)\b/i,
    person: /\b(met |person|name is|works at|contact|friend|colleague|פגשתי|חבר|עובד ב)\b/i,
    recipe: /\b(recipe|cook|ingredient|food|dish|meal|bake|מתכון|בישול|אוכל)\b/i,
    health: /\b(health|doctor|medicine|symptom|hospital|vitamin|רופא|בריאות|תרופה)\b/i,
    finance: /\b(money|pay|paid|cost|price|expense|bank|כסף|שילמתי|עלות|הוצאה)\b/i,
    shopping: /\b(shop|shopping|buy|groceries|supermarket|market|shoes|clothes|קניות|סופר|לקנות)\b/i
  };

  var BOT_NAME = 'SaveNote AI 💬';
  var BOT_COLOR = '#008069';
  var lastProcessedMessages = new Set();

  function categorize(t){for(var k in CATEGORY_KEYWORDS)if(CATEGORY_KEYWORDS[k].test(t))return k;return 'other';}
  function loadNotes(){try{return JSON.parse(localStorage.getItem('savenote_data'))||[];}catch(e){return [];}}
  function saveNotes(n){localStorage.setItem('savenote_data',JSON.stringify(n));}

  // BOT SVG
  const BOT_SVG = `<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;

  // ===== Identity Hijacker =====
  function hijackIdentity() {
    // 1. Sidebar
    const chatTitles = document.querySelectorAll('[data-testid="contact-name"], [data-testid="cell-frame-container"] span[title]');
    chatTitles.forEach(el => {
      const txt = el.textContent || el.getAttribute('title') || '';
      if (txt === 'You' || txt === '(You)' || txt === 'Chat with yourself') {
        el.textContent = BOT_NAME;
        el.style.color = BOT_COLOR;
        el.style.fontWeight = 'bold';
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

    // 2. Header
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

  // ===== Bot Reply Injection =====
  function injectBotReply(html) {
    const chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || 
                     document.querySelector('.copyable-area [role="application"]');
    if (!chatPane) return;

    if (!document.getElementById('sn-bot-css')) {
        const style = document.createElement('style');
        style.id = 'sn-bot-css';
        style.textContent = `
            .sn-bot-reply-container { display: flex; flex-direction: column; margin-bottom: 8px; align-items: flex-start; animation: sn-fade-in 0.3s ease-out; }
            @keyframes sn-fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            .sn-bot-bubble { background-color: #ffffff; border-radius: 0 8px 8px 8px; padding: 8px 12px; max-width: 65%; box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13); position: relative; font-size: 14.2px; line-height: 19px; color: #111b21; margin-left: 8px; }
            .sn-bot-bubble::before { content: ""; position: absolute; top: 0; left: -8px; width: 8px; height: 13px; background: radial-gradient(circle at 0 100%, transparent 8px, #ffffff 8px); }
            .sn-bot-header { font-size: 12px; font-weight: 600; color: #008069; margin-bottom: 4px; }
            .sn-bot-time { font-size: 11px; color: #667781; text-align: right; margin-top: 4px; }
        `;
        document.head.appendChild(style);
    }

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
    chatPane.scrollTop = chatPane.scrollHeight;
  }

  // ===== Business Logic =====
  function handleCommand(text) {
    const lower = text.toLowerCase();
    const notes = loadNotes();
    
    if (lower.includes('what') && lower.includes('book')) {
      const books = notes.filter(n => n.category === 'book');
      if (books.length === 0) injectBotReply("📚 You haven't saved any books yet.");
      else injectBotReply(`📚 <strong>Here are your books:</strong><br>${books.slice(0, 5).map(b => '• ' + b.summary).join('<br>')}`);
      return true;
    }
    if (lower.includes('where') && lower.includes('park')) {
      const p = notes.find(n => n.category === 'parking');
      if (!p) injectBotReply("🅿️ No parking spot found.");
      else injectBotReply(`🅿️ <strong>Last parking spot:</strong><br>"${p.raw_message}"`);
      return true;
    }
    if (lower.includes('what') && lower.includes('shopping')) {
      const shopping = notes.filter(n => n.category === 'shopping');
      if (shopping.length === 0) injectBotReply("🛒 Shopping list empty.");
      else injectBotReply(`🛒 <strong>Shopping list:</strong><br>${shopping.map(s => '• ' + s.summary).join('<br>')}`);
      return true;
    }
    if (lower.match(/\b(help|hi|hello)\b/)) {
        injectBotReply("👋 I'm SaveNote AI. Message me anything to remember it.<br><br>Ask me:<br>• What books did I read?<br>• Where did I park?");
        return true;
    }
    return false;
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

      const header = document.querySelector('[data-testid="conversation-header"]') || document.querySelector('header');
      if (header) {
        const titleEl = header.querySelector('[data-testid="conversation-info-header-chat-title"]') || header.querySelector('span[title]');
        const title = titleEl ? (titleEl.textContent || titleEl.getAttribute('title') || '') : '';
        if (title.includes('SaveNote') || title.includes('(You)') || title.includes('You')) {
            if (!handleCommand(text)) {
                var category = categorize(text);
                var notes = loadNotes();
                notes.unshift({
                    id: Date.now(),
                    category: category,
                    summary: text.length > 120 ? text.substring(0, 117) + '...' : text,
                    raw_message: text,
                    created_at: new Date().toISOString()
                });
                saveNotes(notes);
                injectBotReply(`✅ Got it! Saved under <strong>${category}</strong> ${CATEGORY_EMOJI[category]}`);
            }
        }
      }
    }
  }

  // ===== Init =====
  setInterval(hijackIdentity, 2000);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) processNewElements(node);
      }
    }
  });
  const app = document.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  
  console.log('🤖 SaveNote Native Bookmarklet Ready');
})();
