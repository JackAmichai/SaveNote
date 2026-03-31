/**
 * SaveNote — WhatsApp Web Content Script
 * Pixel-Perfect Native Bot Mode
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__savenote_loaded) return;
  window.__savenote_loaded = true;

  // ===== Configuration =====
  var CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📌',
  };

  var CATEGORY_KEYWORDS = {
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

  var notes = [];
  var lastProcessedMessages = new Set();
  var BOT_NAME = 'SaveNote AI';
  var BOT_COLOR = '#008069';
  var BOT_DARK_COLOR = '#00a884';

  // SVG for bot avatar
  var BOT_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;

  // The little point "tail" of an incoming msg
  var TAIL_SVG = `<svg viewBox="0 0 8 13" width="8" height="13" class=""><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>`;

  // ===== Storage =====
  async function loadNotes() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(['notes'], function(data) {
        notes = data.notes || [];
        resolve(notes);
      });
    });
  }

  async function saveNote(text) {
    if (!text.trim()) return;
    var category = categorize(text);
    
    return new Promise(function(resolve) {
      chrome.runtime.sendMessage({
        type: 'SAVE_NOTE',
        category: category,
        summary: text.length > 120 ? text.substring(0, 117) + '...' : text,
        raw_message: text,
        metadata: {},
        attachments: [],
      }, function(response) {
        if (response && response.success) {
          notes.unshift(response.note);
          // Simulate typing delay before responding
          simulateTyping();
          setTimeout(function() {
            injectBotReply(`✅ Got it! Saved under <strong>${category}</strong> ${CATEGORY_EMOJI[category]}<br><small>"${text}"</small>`);
            resolve(response.note);
          }, 1500);
        }
      });
    });
  }

  // ===== Categorization =====
  function categorize(text) {
    for (var category in CATEGORY_KEYWORDS) {
      if (CATEGORY_KEYWORDS[category].test(text)) return category;
    }
    return 'other';
  }

  // ===== Self-Chat Detection Helper =====
  function isSelfChatTitle(cleanText) {
    return cleanText === 'you' ||
           cleanText === '(you)' ||
           cleanText === 'me' ||
           cleanText === 'yourself' ||
           cleanText === 'אני' ||
           cleanText.includes('(you)') ||
           cleanText.includes('(את)') ||
           cleanText.includes('(אני)') ||
           cleanText.includes('(אתה)') ||
           cleanText.includes('chat with yourself') ||
           cleanText.includes('notes to self') ||
           cleanText.endsWith(' you') ||
           /\(you\)\s*$/.test(cleanText);
  }

  // ===== UI: Bot Identity Hijacker =====
  function hijackIdentity() {
    // Determine Theme
    var bodyClass = document.body.className;
    if (bodyClass.includes('dark')) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }

    // 1. Rename 'You' in sidebar and header
    var chatTitles = document.querySelectorAll('span[title], [data-testid="contact-name"], [data-testid="conversation-info-header-chat-title"]');
    chatTitles.forEach(function(el) {
      var txt = el.textContent || '';
      var titleAttr = el.getAttribute('title') || '';
      // Strip WhatsApp's invisible Bi-Di formatting characters (LRM, RLM) and trim
      var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var cleanTitle = titleAttr.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      
      var isSelfChat = isSelfChatTitle(cleanTx) || isSelfChatTitle(cleanTitle) || txt.includes(BOT_NAME);

      if (isSelfChat) {
        if (txt !== BOT_NAME) {
          el.textContent = BOT_NAME;
        }
        if (!el.classList.contains('sn-sidebar-identity')) {
          el.classList.add('sn-sidebar-identity');
        }
        
        // Try to replace avatar in sidebar or header
        var parent = el.closest('[data-testid="cell-frame-container"]') || el.closest('header');
        if (parent) {
          var avatarContainer = parent.querySelector('[data-testid="avatar-img-container"]');
          if (avatarContainer && !parent.dataset.snHijacked) {
            avatarContainer.innerHTML = BOT_SVG;
            parent.dataset.snHijacked = 'true';
          }
        }
      }
    });
  }

  function simulateTyping() {
      // Find the header subtitle and inject "typing..."
      var headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]') || 
                         document.querySelector('header span[title]');
      if (headerTitle) {
          var titleText = headerTitle.textContent;
          if (titleText === BOT_NAME) {
            var subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]') ||
                                     document.querySelector('header [data-testid="chat-subtitle"]');
            if (subtitleContainer) {
                var oldHTML = subtitleContainer.innerHTML;
                subtitleContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
                setTimeout(function() {
                    subtitleContainer.innerHTML = oldHTML; // Revert after 1.5s
                }, 1400);
            }
          }
      }

      // Sidebar typing
      var chatTitles = document.querySelectorAll('.sn-sidebar-identity');
      chatTitles.forEach(function(el) {
          var parent = el.closest('[data-testid="cell-frame-container"]');
          if (parent) {
              var lastMsgContainer = parent.querySelector('[data-testid="last-msg-status"]')?.parentNode;
              if (lastMsgContainer && !lastMsgContainer.dataset.snTyping) {
                  var oldHTML = lastMsgContainer.innerHTML;
                  lastMsgContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
                  lastMsgContainer.dataset.snTyping = 'true';
                  setTimeout(function() {
                      lastMsgContainer.innerHTML = oldHTML;
                      delete lastMsgContainer.dataset.snTyping;
                  }, 1400);
              }
          }
      });
  }

  function injectBotReply(html) {
    // 1. Try finding the scrollable message list inside the new WhatsApp layout
    var chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || 
                   document.querySelector('[data-testid="conversation-panel-messages"]') ||
                   document.querySelector('.copyable-area [role="application"]') ||
                   document.querySelector('#main .copyable-area') ||
                   document.querySelector('#main [role="application"]');
    
    // Fallback if completely undetected
    if (!chatPane) return;

    var row = document.createElement('div');
    row.className = 'sn-bot-msg-row';
    
    var nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
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

    // Append to the list of messages container (not just the scroll area)
    var list = chatPane.querySelector('[role="list"]') || chatPane;
    list.appendChild(row);
    
    // Scroll to bottom
    setTimeout(function() {
      chatPane.scrollTop = chatPane.scrollHeight + 500;
    }, 100);
  }

  // ===== Command Handler =====
  function handleCommand(text) {
    var lower = text.toLowerCase();
    
    if (lower.includes('what') && lower.includes('book')) {
      var books = notes.filter(function(n) { return n.category === 'book'; });
      simulateTyping();
      setTimeout(function() {
          if (books.length === 0) {
            injectBotReply("📚 You haven't saved any books yet! Just send me a book title to start your list.");
          } else {
            var list = books.slice(0, 5).map(function(b) { return '• ' + b.summary; }).join('<br>');
            injectBotReply(`📚 <strong>Here are the last few books you read:</strong><br>${list}`);
          }
      }, 1500);
      return true;
    }
    
    if (lower.includes('where') && lower.includes('park')) {
      var parking = notes.find(function(n) { return n.category === 'parking'; });
      simulateTyping();
      setTimeout(function() {
          if (!parking) {
            injectBotReply("🅿️ I don't have any recent parking notes. Don't forget to tell me where you park next time!");
          } else {
            injectBotReply(`🅿️ <strong>Last parking spot found:</strong><br>"${parking.raw_message}"<br><small>Saved ${new Date(parking.created_at).toLocaleTimeString()}</small>`);
          }
      }, 1500);
      return true;
    }

    if (lower.includes('what') && (lower.includes('shop') || lower.includes('groceries'))) {
        var shopping = notes.filter(function(n) { return n.category === 'shopping'; });
        simulateTyping();
        setTimeout(function() {
            if (shopping.length === 0) {
              injectBotReply("🛒 Your shopping list is empty.");
            } else {
              var list = shopping.map(function(s) { return '• ' + s.summary; }).join('<br>');
              injectBotReply(`🛒 <strong>Your shopping list:</strong><br>${list}`);
            }
        }, 1500);
        return true;
    }

    if (lower.match(/\b(help|hi|hello)\b/)) {
      simulateTyping();
      setTimeout(function() {
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
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) processNewElements(node);
        }
      }
    });

    var app = document.querySelector('#app') || document.body;
    if (app) {
      observer.observe(app, { childList: true, subtree: true });
    }
  }

  function processNewElements(el) {
    var msgContainers = el.querySelectorAll ? [
      ...el.querySelectorAll('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id]'),
      ...(el.matches && el.matches('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id]') ? [el] : []),
    ] : [];

    for (var i = 0; i < msgContainers.length; i++) {
      var container = msgContainers[i];
      
      // CRITICAL: Only process messages in the main conversation pane, skip sidebar last-message previews
      if (!container.closest('#main') && !container.closest('[data-testid="conversation-panel-body"]')) {
          continue;
      }

      var dataId = container.getAttribute('data-id');
      var isOutgoingId = dataId && dataId.startsWith('true_');
      var isOutgoingClass = container.closest('.message-out') || container.classList.contains('message-out');
      var hasOutgoingCheck = container.querySelector('[data-icon="msg-dblcheck"]') || container.querySelector('[data-icon="msg-check"]');
      
      var isOutgoing = isOutgoingId || isOutgoingClass || hasOutgoingCheck;

      if (!isOutgoing) continue;

      var textWrapper = container.querySelector('.selectable-text span') || 
                          container.querySelector('.selectable-text') ||
                          container.querySelector('.copyable-text[data-pre-plain-text]') ||
                          container.querySelector('span.copyable-text');
      
      if (!textWrapper) continue;

      // Extract text and try to exclude timestamp
      var text = "";
      if (textWrapper.querySelector('span.selectable-text')) {
          text = textWrapper.querySelector('span.selectable-text').textContent;
      } else {
          // Clone to avoid modifying DOM, then remove metadata if present
          var clone = textWrapper.cloneNode(true);
          var meta = clone.querySelector('[data-testid="msg-meta"], .metadata, .copyable-text');
          if (meta) meta.remove();
          text = clone.textContent;
      }
      
      text = text.trim();
      // Secondary fallback: regex to strip trailing timestamp if still present
      text = text.replace(/\s*\d{1,2}:\d{2}(\s*[ap]m)?$/i, '');
      
      if (!text || text.length < 2) continue;

      if (lastProcessedMessages.has(text)) continue;
      lastProcessedMessages.add(text);
      console.log('🤖 [SaveNote] Intercepted new outgoing message:', text);

      checkSelfChat().then(function(isSelf) {
        if (isSelf) {
          console.log('🤖 [SaveNote] Self-chat confirmed! Processing...');
          if (!handleCommand(text)) {
            // Wait a tiny bit to make sure DOM settles before saving state
            setTimeout(function() { saveNote(text); }, 200);
          }
        } else {
            console.log('🤖 [SaveNote] Not a self-chat. Skipping.');
        }
      });
    }
  }

  async function checkSelfChat() {
    var main = document.querySelector('#main');
    var header = (main && main.querySelector('header')) || 
                 document.querySelector('[data-testid="conversation-header"]') || 
                 document.querySelector('header[role="banner"]');
    
    if (!header) {
        console.log('🤖 [SaveNote] Header not found in main pane.');
        return false;
    }

    // Strategy 1: Check specific title elements
    var titleEl = header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
                    header.querySelector('span[title]') ||
                    header.querySelector('[data-testid="contact-name"]');
    
    if (titleEl) {
        var title = titleEl.textContent || '';
        var titleAttr = titleEl.getAttribute('title') || '';
        var cleanTx = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        var cleanAttr = titleAttr.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        
        console.log('🤖 [SaveNote] Chat title text:', JSON.stringify(title), 'attr:', JSON.stringify(titleAttr));

        if (title.includes(BOT_NAME) || isSelfChatTitle(cleanTx) || isSelfChatTitle(cleanAttr)) {
            return true;
        }
    }

    // Strategy 2: Scan ALL spans in the header for self-chat indicators
    var allSpans = header.querySelectorAll('span');
    for (var i = 0; i < allSpans.length; i++) {
        var spanText = (allSpans[i].textContent || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        var spanTitle = (allSpans[i].getAttribute('title') || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        if (isSelfChatTitle(spanText) || isSelfChatTitle(spanTitle)) {
            console.log('🤖 [SaveNote] Self-chat detected via header span scan:', allSpans[i].textContent);
            return true;
        }
        // Check if any span contains the BOT_NAME (already hijacked)
        if ((allSpans[i].textContent || '').includes(BOT_NAME)) {
            return true;
        }
    }

    // Strategy 3: Check the full header text as a last resort
    var headerText = header.textContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
    console.log('🤖 [SaveNote] Full header text:', JSON.stringify(headerText));
    if (isSelfChatTitle(headerText) || headerText.includes(BOT_NAME.toLowerCase())) {
        console.log('🤖 [SaveNote] Self-chat detected via full header text.');
        return true;
    }

    // Strategy 4: Check if the hijacker has already marked a sidebar identity for this chat
    var sidebarIdentities = document.querySelectorAll('.sn-sidebar-identity');
    if (sidebarIdentities.length > 0) {
        // Check if any sidebar identity element is highlighted/active (current chat)
        for (var j = 0; j < sidebarIdentities.length; j++) {
            var cell = sidebarIdentities[j].closest('[data-testid="cell-frame-container"]');
            if (cell) {
                var listItem = cell.closest('[aria-selected="true"], [data-testid="chat-list-item"]');
                if (listItem && listItem.getAttribute('aria-selected') === 'true') {
                    console.log('🤖 [SaveNote] Self-chat detected via active sidebar identity.');
                    return true;
                }
            }
        }
    }

    console.log('🤖 [SaveNote] Not a self-chat. No indicators found.');
    return false;
  }

  // ===== Initialize =====
  function init() {
    console.log(`🤖 ${BOT_NAME} Pixel-Perfect Native Bot Mode activated`);
    loadNotes().then(function() {
      startObservers();
    });
  }

  // Wait for DOM
  if (document.readyState === 'complete') {
    setTimeout(init, 2000);
  } else {
    window.addEventListener('load', function() { setTimeout(init, 2000); });
  }
})();
