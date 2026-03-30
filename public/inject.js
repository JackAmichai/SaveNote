/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Pixel-Perfect Native Bot Mode without Extension
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

  var BOT_NAME = 'SaveNote AI';
  var BOT_COLOR = '#008069';
  var lastProcessedMessages = new Set();
  
  function categorize(t){for(var k in CATEGORY_KEYWORDS)if(CATEGORY_KEYWORDS[k].test(t))return k;return 'other';}
  function loadNotes(){try{return JSON.parse(localStorage.getItem('savenote_data'))||[];}catch(e){return [];}}
  function saveNotes(n){localStorage.setItem('savenote_data',JSON.stringify(n));}

  // SVG for bot avatar
  const BOT_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;
  // The little point "tail" of an incoming msg
  const TAIL_SVG = `<svg viewBox="0 0 8 13" width="8" height="13" class=""><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>`;

  // ===== Identity Hijacker =====
  function hijackIdentity() {
    const bodyClass = document.body.className;
    if (bodyClass.includes('dark')) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }

    const chatTitles = document.querySelectorAll('span[title], [data-testid="contact-name"]');
    chatTitles.forEach(el => {
      const txt = el.textContent || el.getAttribute('title') || '';
      const cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      const isSelfChat = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.includes('chat with yourself') || cleanTx === 'me' || cleanTx === 'אני' || txt.includes(BOT_NAME);

      if (isSelfChat) {
        if (txt !== BOT_NAME) el.textContent = BOT_NAME;
        el.className += ' sn-sidebar-identity';
        const parent = el.closest('[data-testid="cell-frame-container"]');
        if (parent) {
          const avatar = parent.querySelector('[data-testid="avatar-img-container"] img, [data-testid="avatar-img-container"]');
          if (avatar && !parent.dataset.snHijacked) {
            const container = parent.querySelector('[data-testid="avatar-img-container"]');
            if (container) container.innerHTML = BOT_SVG;
            parent.dataset.snHijacked = 'true';
          }
        }
      }
    });

    const headerTitle = document.querySelector('header span[title], [data-testid="conversation-info-header-chat-title"]');
    if (headerTitle) {
      const txt = headerTitle.textContent || headerTitle.getAttribute('title') || '';
      const cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      const isSelfChatHeader = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.includes('chat with yourself') || cleanTx === 'me' || cleanTx === 'אני' || txt.includes(BOT_NAME);

      if (isSelfChatHeader) {
        if (txt !== BOT_NAME) headerTitle.textContent = BOT_NAME;
        const header = headerTitle.closest('header');
        if (header) {
          const avatarContainer = header.querySelector('[data-testid="avatar-img-container"]');
          if (avatarContainer && !header.dataset.snHijacked) {
            avatarContainer.innerHTML = BOT_SVG;
            header.dataset.snHijacked = 'true';
          }
        }
      }
    }
  }

  function simulateTyping() {
      const headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
      if (headerTitle) {
          const titleText = headerTitle.textContent;
          if (titleText === BOT_NAME) {
            const subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]');
            if (subtitleContainer) {
                const oldHTML = subtitleContainer.innerHTML;
                subtitleContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
                setTimeout(() => { subtitleContainer.innerHTML = oldHTML; }, 1400);
            }
          }
      }

      const chatTitles = document.querySelectorAll('.sn-sidebar-identity');
      chatTitles.forEach(el => {
          const parent = el.closest('[data-testid="cell-frame-container"]');
          if (parent) {
              const lastMsgContainer = parent.querySelector('[data-testid="last-msg-status"]')?.parentNode;
              if (lastMsgContainer && !lastMsgContainer.dataset.snTyping) {
                  const oldHTML = lastMsgContainer.innerHTML;
                  lastMsgContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
                  lastMsgContainer.dataset.snTyping = 'true';
                  setTimeout(() => {
                      lastMsgContainer.innerHTML = oldHTML;
                      delete lastMsgContainer.dataset.snTyping;
                  }, 1400);
              }
          }
      });
  }

  // ===== Bot Reply Injection =====
  function injectBotReply(html) {
    let chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || 
                   document.querySelector('[data-testid="conversation-panel-messages"]') ||
                   document.querySelector('.copyable-area [role="application"]') ||
                   document.querySelector('#main .copyable-area');
                   
    if (!chatPane) return;

    if (!document.getElementById('sn-bot-css')) {
        const style = document.createElement('style');
        style.id = 'sn-bot-css';
        style.textContent = `
            .sn-bot-msg-row { display: flex; flex-direction: column; width: 100%; margin-bottom: 2px; align-items: flex-start; animation: sn-fade-in 0.2s ease-out; }
            @keyframes sn-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            .sn-bot-bubble-wrapper { position: relative; display: flex; max-width: 65%; margin-left: 9px; margin-bottom: 8px; margin-top: 8px; }
            .sn-bot-tail { position: absolute; top: 0; left: -8px; width: 8px; height: 13px; color: #ffffff; z-index: 100; }
            [data-theme="dark"] .sn-bot-tail { color: #202c33; }
            .sn-bot-bubble { background-color: #ffffff; border-radius: 0 7.5px 7.5px 7.5px; padding: 6px 7px 8px 9px; box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111b21; font-size: 14.2px; line-height: 19px; display: flex; flex-direction: column; min-width: 120px; }
            [data-theme="dark"] .sn-bot-bubble { background-color: #202c33; color: #e9edef; box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13); }
            .sn-bot-name { font-size: 12.8px; font-weight: 500; color: #008069; margin-bottom: 2px; line-height: 22px; }
            [data-theme="dark"] .sn-bot-name { color: #00a884; }
            .sn-bot-text { word-break: break-word; white-space: pre-wrap; margin-bottom: 4px; }
            .sn-bot-meta { display: flex; justify-content: flex-end; align-items: center; margin-top: -10px; float: right; margin-left: 14px; }
            .sn-bot-time { font-size: 11px; color: #667781; margin-top: 10px; }
            [data-theme="dark"] .sn-bot-time { color: #8696a0; }
            .sn-sidebar-identity { color: #008069 !important; font-weight: 500 !important; }
            [data-theme="dark"] .sn-sidebar-identity { color: #00a884 !important; }
            .sn-typing-text { color: #008069 !important; font-size: 13px !important; font-weight: 400 !important; font-family: inherit; }
            [data-theme="dark"] .sn-typing-text { color: #00a884 !important; }
        `;
        document.head.appendChild(style);
    }

    const row = document.createElement('div');
    row.className = 'sn-bot-msg-row';
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    row.innerHTML = `
      <div class="sn-bot-bubble-wrapper">
        <span class="sn-bot-tail">${TAIL_SVG}</span>
        <div class="sn-bot-bubble">
          <div class="sn-bot-name">${BOT_NAME}</div>
          <div class="sn-bot-text">${html}</div>
          <div class="sn-bot-meta">
            <span class="sn-bot-time">${nowStr}</span>
          </div>
        </div>
      </div>
    `;

    const list = chatPane.querySelector('[role="list"]') || chatPane;
    list.appendChild(row);
    
    setTimeout(() => { chatPane.scrollTop = chatPane.scrollHeight + 500; }, 100);
  }

  // ===== Business Logic =====
  function handleCommand(text) {
    const lower = text.toLowerCase();
    const notes = loadNotes();
    
    if (lower.includes('what') && lower.includes('book')) {
      const books = notes.filter(n => n.category === 'book');
      simulateTyping();
      setTimeout(() => {
          if (books.length === 0) injectBotReply("📚 You haven't saved any books yet.");
          else injectBotReply(`📚 <strong>Here are your books:</strong><br>${books.slice(0, 5).map(b => '• ' + b.summary).join('<br>')}`);
      }, 1500);
      return true;
    }
    if (lower.includes('where') && lower.includes('park')) {
      const p = notes.find(n => n.category === 'parking');
      simulateTyping();
      setTimeout(() => {
          if (!p) injectBotReply("🅿️ No parking spot found.");
          else injectBotReply(`🅿️ <strong>Last parking spot:</strong><br>"${p.raw_message}"`);
      }, 1500);
      return true;
    }
    if (lower.includes('what') && lower.includes('shopping')) {
      const shopping = notes.filter(n => n.category === 'shopping');
      simulateTyping();
      setTimeout(() => {
          if (shopping.length === 0) injectBotReply("🛒 Shopping list empty.");
          else injectBotReply(`🛒 <strong>Shopping list:</strong><br>${shopping.map(s => '• ' + s.summary).join('<br>')}`);
      }, 1500);
      return true;
    }
    if (lower.match(/\b(help|hi|hello)\b/)) {
        simulateTyping();
        setTimeout(() => {
            injectBotReply(`👋 Hi, I'm ${BOT_NAME}. Message me anything to remember it.<br><br>Ask me:<br>• What books did I read?<br>• Where did I park?`);
        }, 1500);
        return true;
    }
    return false;
  }

  function processNewElements(el) {
    console.log('🤖 [SaveNote] Checking new elements...');
    const msgContainers = el.querySelectorAll ? [
      ...el.querySelectorAll('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id]'),
      ...(el.matches && el.matches('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id]') ? [el] : []),
    ] : [];

    if (msgContainers.length > 0) {
        console.log(`🤖 [SaveNote] Found ${msgContainers.length} possible message containers`);
    }

    for (const container of msgContainers) {
      const dataId = container.getAttribute('data-id');
      const isOutgoingId = dataId && dataId.startsWith('true_');
      const isOutgoingClass = container.closest('.message-out') || container.classList.contains('message-out');
      const hasOutgoingCheck = container.querySelector('[data-icon="msg-dblcheck"]') || container.querySelector('[data-icon="msg-check"]');
      
      const isOutgoing = isOutgoingId || isOutgoingClass || hasOutgoingCheck;

      if (!isOutgoing) continue;

      const textWrapper = container.querySelector('.copyable-text[data-pre-plain-text]') || 
                          container.querySelector('.selectable-text') ||
                          container.querySelector('span.copyable-text');
      
      if (!textWrapper) {
          console.log('🤖 [SaveNote] Found outgoing container but no text wrapper:', container);
          continue;
      }

      const text = textWrapper.textContent.trim();
      if (!text || text.length < 2) continue;

      if (lastProcessedMessages.has(text)) continue;
      lastProcessedMessages.add(text);
      console.log('🤖 [SaveNote] Intercepted new outgoing message:', text);

      const header = document.querySelector('header') || document.querySelector('[data-testid="conversation-header"]');
      if (header) {
        const titleEl = header.querySelector('span[title]') || 
                        header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
                        header.querySelector('[data-testid="chat-subtitle"]')?.previousElementSibling;
        
        const title = titleEl ? (titleEl.textContent || titleEl.getAttribute('title') || '') : '';
        const cleanTx = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        
        console.log('🤖 [SaveNote] Current chat title:', title);

        const isSelf = title.includes(BOT_NAME) || 
                       cleanTx.includes('(you)') || 
                       cleanTx === 'you' || 
                       cleanTx === 'me' || 
                       cleanTx === 'אני';

        if (isSelf) {
            console.log('🤖 [SaveNote] Self-chat confirmed! Processing...');
            if (!handleCommand(text)) {
                setTimeout(() => {
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
                    simulateTyping();
                    setTimeout(() => {
                        injectBotReply(`✅ Got it! Saved under <strong>${category}</strong> ${CATEGORY_EMOJI[category]}<br><small>"${text}"</small>`);
                    }, 1500);
                }, 200);
            }
        } else {
            console.log('🤖 [SaveNote] Not a self-chat. Skipping.');
        }
      } else {
          console.log('🤖 [SaveNote] Conversation header not found.');
      }
    }
  }

  // ===== Init =====
  setInterval(hijackIdentity, 1500);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) processNewElements(node);
      }
    }
  });
  
  // Attach to body to ensure we don't miss #app name changes
  const app = document.querySelector('#app') || document.body;
  if (app) observer.observe(app, { childList: true, subtree: true });
  
  console.log(`🤖 ${BOT_NAME} Pixel-Perfect Native Bookmarklet Ready`);
})();
