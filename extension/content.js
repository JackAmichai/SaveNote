/**
 * SaveNote — WhatsApp Web Content Script
 * Pixel-Perfect Native Bot Mode
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
  const BOT_NAME = 'SaveNote AI';
  const BOT_COLOR = '#008069';
  const BOT_DARK_COLOR = '#00a884';

  // SVG for bot avatar
  const BOT_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;

  // The little point "tail" of an incoming msg
  const TAIL_SVG = `<svg viewBox="0 0 8 13" width="8" height="13" class=""><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>`;

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
          // Simulate typing delay before responding
          simulateTyping();
          setTimeout(() => {
            injectBotReply(`✅ Got it! Saved under <strong>${category}</strong> ${CATEGORY_EMOJI[category]}<br><small>"${text}"</small>`);
            resolve(response.note);
          }, 1500);
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
    // Determine Theme
    const bodyClass = document.body.className;
    if (bodyClass.includes('dark')) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }

    // 1. Rename 'You' in sidebar
    const chatTitles = document.querySelectorAll('[data-testid="contact-name"], [data-testid="cell-frame-container"] span[title]');
    chatTitles.forEach(el => {
      const txt = el.textContent || el.getAttribute('title') || '';
      if (txt === 'You' || txt === '(You)' || txt === 'Chat with yourself' || txt === BOT_NAME) {
        if (txt !== BOT_NAME) {
          el.textContent = BOT_NAME;
        }
        el.className += ' sn-sidebar-identity';
        
        // Try to replace avatar
        const parent = el.closest('[data-testid="cell-frame-container"]');
        if (parent) {
          const avatar = parent.querySelector('[data-testid="avatar-img-container"] img, [data-testid="avatar-img-container"]');
          if (avatar && !parent.dataset.snHijacked) {
            const container = parent.querySelector('[data-testid="avatar-img-container"]');
            if (container) {
                container.innerHTML = BOT_SVG;
            }
            parent.dataset.snHijacked = 'true';
          }
        }
      }
    });

    // 2. Rename in active conversation header
    const headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
    if (headerTitle) {
      const txt = headerTitle.textContent;
      if (txt === 'You' || txt === '(You)' || txt === 'Chat with yourself' || txt === BOT_NAME) {
        if (txt !== BOT_NAME) {
            headerTitle.textContent = BOT_NAME;
        }
        
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
      // Find the header subtitle and inject "typing..."
      const headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
      if (headerTitle) {
          const titleText = headerTitle.textContent;
          if (titleText === BOT_NAME) {
            const subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]');
            if (subtitleContainer) {
                const oldHTML = subtitleContainer.innerHTML;
                subtitleContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
                setTimeout(() => {
                    subtitleContainer.innerHTML = oldHTML; // Revert after 1.5s
                }, 1400);
            }
          }
      }

      // Sidebar typing
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

  // ===== UI: Bot Reply Injector =====
  function injectBotReply(html) {
    // 1. Try finding the scrollable message list inside the new WhatsApp layout
    let chatPane = document.querySelector('[data-testid="conversation-panel-body"]');
    
    // Fallback if not found
    if (!chatPane) {
      chatPane = document.querySelector('.copyable-area [role="application"]');
    }
    
    if (!chatPane) return;

    const row = document.createElement('div');
    row.className = 'sn-bot-msg-row';
    
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    row.innerHTML = \`
      <div class="sn-bot-bubble-wrapper">
        <span class="sn-bot-tail">\${TAIL_SVG}</span>
        <div class="sn-bot-bubble">
          <div class="sn-bot-name">\${BOT_NAME}</div>
          <div class="sn-bot-text">\${html}</div>
          <div class="sn-bot-meta">
            <span class="sn-bot-time">\${nowStr}</span>
          </div>
        </div>
      </div>
    \`;

    // Append to the list of messages container (not just the scroll area)
    const list = chatPane.querySelector('[role="list"]') || chatPane;
    list.appendChild(row);
    
    // Scroll to bottom
    setTimeout(() => {
      chatPane.scrollTop = chatPane.scrollHeight + 500;
    }, 100);
  }

  // ===== Command Handler =====
  function handleCommand(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes('what') && lower.includes('book')) {
      const books = notes.filter(n => n.category === 'book');
      simulateTyping();
      setTimeout(() => {
          if (books.length === 0) {
            injectBotReply("📚 You haven't saved any books yet! Just send me a book title to start your list.");
          } else {
            const list = books.slice(0, 5).map(b => `• ${b.summary}`).join('<br>');
            injectBotReply(`📚 <strong>Here are the last few books you read:</strong><br>${list}`);
          }
      }, 1500);
      return true;
    }
    
    if (lower.includes('where') && lower.includes('park')) {
      const parking = notes.find(n => n.category === 'parking');
      simulateTyping();
      setTimeout(() => {
          if (!parking) {
            injectBotReply("🅿️ I don't have any recent parking notes. Don't forget to tell me where you park next time!");
          } else {
            injectBotReply(`🅿️ <strong>Last parking spot found:</strong><br>"${parking.raw_message}"<br><small>Saved ${new Date(parking.created_at).toLocaleTimeString()}</small>`);
          }
      }, 1500);
      return true;
    }

    if (lower.includes('what') && (lower.includes('shop') || lower.includes('groceries'))) {
        const shopping = notes.filter(n => n.category === 'shopping');
        simulateTyping();
        setTimeout(() => {
            if (shopping.length === 0) {
              injectBotReply("🛒 Your shopping list is empty.");
            } else {
              const list = shopping.map(s => `• ${s.summary}`).join('<br>');
              injectBotReply(`🛒 <strong>Your shopping list:</strong><br>${list}`);
            }
        }, 1500);
        return true;
    }

    if (lower.includes('help') || lower.includes('hello') || lower.includes('hi ')) {
      simulateTyping();
      setTimeout(() => {
          injectBotReply(`👋 <strong>Hi! I'm ${BOT_NAME}.</strong><br>I'm your personal memory assistant. Just message me anything you want to remember, and I'll categorize it for you!<br><br>Ask me:<br>• "What books did I read?"<br>• "Where did I park?"<br>• "What's on my shopping list?"`);
      }, 1500);
      return true;
    }

    return false;
  }

  // ===== WhatsApp Web Message Observer =====
  function startObservers() {
    // 1. Identity Hijacker Interval
    setInterval(hijackIdentity, 1500);

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
            // Wait a tiny bit to make sure DOM settles before saving state
            setTimeout(() => { saveNote(text); }, 200);
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
    return title.includes(BOT_NAME) || title.includes('(You)') || title.includes('You');
  }

  // ===== Initialize =====
  function init() {
    console.log(`🤖 ${BOT_NAME} Pixel-Perfect Native Bot Mode activated`);
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
