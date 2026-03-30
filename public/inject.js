/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Pixel-Perfect Native Bot Mode without Extension - IMPROVED
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
  
  function categorize(t) {
    for (var k in CATEGORY_KEYWORDS) {
      if (CATEGORY_KEYWORDS[k].test(t)) return k;
    }
    return 'other';
  }
  
  // localStorage helpers (bookmarklet-compatible)
  function loadNotes() {
    try {
      var data = localStorage.getItem('savenote_data');
      if (!data) return [];
      return JSON.parse(data) || [];
    } catch (e) {
      console.error('🤖 [SaveNote] Error loading notes:', e);
      return [];
    }
  }
  
  function saveNotes(notes) {
    try {
      localStorage.setItem('savenote_data', JSON.stringify(notes));
    } catch (e) {
      console.error('🤖 [SaveNote] Error saving notes:', e);
    }
  }
  
  // Export notes for backup
  function exportNotes() {
    var notes = loadNotes();
    return JSON.stringify(notes, null, 2);
  }
  
  // Import notes from JSON string
  function importNotes(jsonStr) {
    try {
      var imported = JSON.parse(jsonStr);
      if (Array.isArray(imported)) {
        localStorage.setItem('savenote_data', JSON.stringify(imported));
        return true;
      }
      return false;
    } catch (e) {
      console.error('🤖 [SaveNote] Error importing notes:', e);
      return false;
    }
  }
  
  // SVG for bot avatar
  var BOT_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="' + BOT_COLOR + '"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>';
  
  // The little point "tail" of an incoming msg
  var TAIL_SVG = '<svg viewBox="0 0 8 13" width="8" height="13"><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>';
  
  // ===== Identity Hijacker =====
  function hijackIdentity() {
    try {
      var bodyClass = document.body.className;
      if (bodyClass.includes('dark')) {
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.body.setAttribute('data-theme', 'light');
      }
      
      var chatTitles = document.querySelectorAll('span[title], [data-testid="contact-name"]');
      chatTitles.forEach(function(el) {
        var txt = el.textContent || el.getAttribute('title') || '';
        var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        var isSelfChat = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.includes('chat with yourself') || cleanTx === 'me' || cleanTx === 'אני' || txt.includes(BOT_NAME);
        if (isSelfChat) {
          if (txt !== BOT_NAME) el.textContent = BOT_NAME;
          el.className += ' sn-sidebar-identity';
          var parent = el.closest('[data-testid="cell-frame-container"]');
          if (parent) {
            var avatar = parent.querySelector('[data-testid="avatar-img-container"] img, [data-testid="avatar-img-container"]');
            if (avatar && !parent.dataset.snHijacked) {
              var container = parent.querySelector('[data-testid="avatar-img-container"]');
              if (container) container.innerHTML = BOT_SVG;
              parent.dataset.snHijacked = 'true';
            }
          }
        }
      });
      
      var headerTitle = document.querySelector('header span[title], [data-testid="conversation-info-header-chat-title"]');
      if (headerTitle) {
        var txt = headerTitle.textContent || headerTitle.getAttribute('title') || '';
        var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        var isSelfChatHeader = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.includes('chat with yourself') || cleanTx === 'me' || cleanTx === 'אני' || txt.includes(BOT_NAME);
        if (isSelfChatHeader) {
          if (txt !== BOT_NAME) headerTitle.textContent = BOT_NAME;
          var header = headerTitle.closest('header');
          if (header) {
            var avatarContainer = header.querySelector('[data-testid="avatar-img-container"]');
            if (avatarContainer && !header.dataset.snHijacked) {
              avatarContainer.innerHTML = BOT_SVG;
              header.dataset.snHijacked = 'true';
            }
          }
        }
      }
    } catch (e) {
      console.error('🤖 [SaveNote] Error hijacking identity:', e);
    }
  }
  
  function simulateTyping() {
    try {
      var headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
      if (headerTitle) {
        var titleText = headerTitle.textContent;
        if (titleText === BOT_NAME) {
          var subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]');
          if (subtitleContainer) {
            var oldHTML = subtitleContainer.innerHTML;
            subtitleContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
            setTimeout(function() { subtitleContainer.innerHTML = oldHTML; }, 1400);
          }
        }
      }
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
    } catch (e) {
      console.error('🤖 [SaveNote] Error simulating typing:', e);
    }
  }
  
  // ===== Bot Reply Injection =====
  function injectBotReply(html) {
    try {
      var chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || 
                     document.querySelector('[data-testid="conversation-panel-messages"]') ||
                     document.querySelector('.copyable-area [role="application"]') ||
                     document.querySelector('#main .copyable-area') ||
                     document.querySelector('[role="list"]');
      
      if (!chatPane) {
        console.warn('🤖 [SaveNote] Chat pane not found for bot reply');
        return;
      }
      
      if (!document.getElementById('sn-bot-css')) {
        var style = document.createElement('style');
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
      
      var list = chatPane.querySelector('[role="list"]') || chatPane;
      list.appendChild(row);
      
      setTimeout(function() { chatPane.scrollTop = chatPane.scrollHeight + 500; }, 100);
    } catch (e) {
      console.error('🤖 [SaveNote] Error injecting bot reply:', e);
    }
  }
  
  // ===== Business Logic =====
  function handleCommand(text) {
    var lower = text.toLowerCase();
    var notes = loadNotes();
    
    if (lower.includes('what') && lower.includes('book')) {
      var books = notes.filter(function(n) { return n.category === 'book'; });
      simulateTyping();
      setTimeout(function() {
        if (books.length === 0) injectBotReply("📚 You haven't saved any books yet.");
        else injectBotReply(`📚 <strong>Here are your books:</strong><br>${books.slice(0, 5).map(function(b) { return '• ' + b.summary; }).join('<br>')}`);
      }, 1500);
      return true;
    }
    if (lower.includes('where') && lower.includes('park')) {
      var p = notes.find(function(n) { return n.category === 'parking'; });
      simulateTyping();
      setTimeout(function() {
        if (!p) injectBotReply("🅿️ No parking spot found.");
        else injectBotReply(`🅿️ <strong>Last parking spot:</strong><br>"${p.raw_message}"`);
      }, 1500);
      return true;
    }
    if (lower.includes('what') && lower.includes('shopping')) {
      var shopping = notes.filter(function(n) { return n.category === 'shopping'; });
      simulateTyping();
      setTimeout(function() {
        if (shopping.length === 0) injectBotReply("🛒 Shopping list empty.");
        else injectBotReply(`🛒 <strong>Shopping list:</strong><br>${shopping.map(function(s) { return '• ' + s.summary; }).join('<br>')}`);
      }, 1500);
      return true;
    }
    if (lower.includes('what') && lower.includes('note')) {
      var all = notes.slice(0, 10);
      simulateTyping();
      setTimeout(function() {
        if (all.length === 0) injectBotReply("📌 No notes saved yet.");
        else injectBotReply(`📌 <strong>Your latest notes:</strong><br>${all.map(function(n) { return '• [' + CATEGORY_EMOJI[n.category] + '] ' + n.summary; }).join('<br>')}`);
      }, 1500);
      return true;
    }
    if (lower.match(/\b(help|hi|hello)\b/)) {
      simulateTyping();
      setTimeout(function() {
        injectBotReply(`👋 Hi, I'm ${BOT_NAME}. Message me anything to remember it.<br><br>Ask me:<br>• What books did I read?<br>• Where did I park?<br>• What's on my shopping list?<br>• Show me my notes`);
      }, 1500);
      return true;
    }
    return false;
  }
  
  // ===== Process New Elements (Outgoing Messages) =====
  function processNewElements(el) {
    try {
      var msgContainers = [];
      
      if (el.querySelectorAll) {
        msgContainers = [
          ...el.querySelectorAll('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id]'),
          ...el.querySelectorAll('.message-in, .message-out'),
          ...(el.matches && el.matches('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-in, .message-out') ? [el] : []),
        ];
      }
      
      for (var i = 0; i < msgContainers.length; i++) {
        var container = msgContainers[i];
        var dataId = container.getAttribute('data-id');
        
        // Multiple ways to detect outgoing messages
        var isOutgoingId = dataId && dataId.startsWith('true_');
        var isOutgoingClass = container.closest('.message-out') || container.classList.contains('message-out');
        var hasOutgoingCheck = container.querySelector('[data-icon="msg-dblcheck"]') || container.querySelector('[data-icon="msg-check"]');
        var isIncomingCheck = container.closest('.message-in') || container.classList.contains('message-in');
        
        // Skip incoming messages
        if (isIncomingCheck) continue;
        
        var isOutgoing = isOutgoingId || isOutgoingClass || hasOutgoingCheck;
        if (!isOutgoing) continue;
        
        // Extract text with multiple fallback selectors
        var textWrapper = container.querySelector('.copyable-text[data-pre-plain-text]') || 
                          container.querySelector('.selectable-text') ||
                          container.querySelector('span.copyable-text') ||
                          container.querySelector('[data-pre-plain-text]') ||
                          container.querySelector('span[aria-hidden="true"]');
        
        if (!textWrapper) {
          continue;
        }
        
        var text = textWrapper.textContent.trim();
        if (!text || text.length < 2) continue;
        if (lastProcessedMessages.has(text)) continue;
        
        lastProcessedMessages.add(text);
        console.log('🤖 [SaveNote] Intercepted new outgoing message:', text);
        
        // Get header and check if it's self-chat
        var header = document.querySelector('header') || document.querySelector('[data-testid="conversation-header"]');
        if (header) {
          var titleEl = header.querySelector('span[title]') || 
                        header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
                        header.querySelector('[data-testid="chat-subtitle"]')?.previousElementSibling;
          
          var title = titleEl ? (titleEl.textContent || titleEl.getAttribute('title') || '') : '';
          var cleanTx = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
          
          console.log('🤖 [SaveNote] Current chat title:', title);
          
          var isSelf = title.includes(BOT_NAME) || 
                       cleanTx.includes('(you)') || 
                       cleanTx === 'you' || 
                       cleanTx === 'me' || 
                       cleanTx === 'אני' ||
                       container.closest('.dq9p8160'); // Additional class for self-chat
          
          if (isSelf) {
            console.log('🤖 [SaveNote] Self-chat confirmed! Processing...');
            if (!handleCommand(text)) {
              (function(t) {
                setTimeout(function() {
                  var cat = categorize(t);
                  var notesArr = loadNotes();
                  notesArr.unshift({
                    id: Date.now(),
                    category: cat,
                    summary: t.length > 120 ? t.substring(0, 117) + '...' : t,
                    raw_message: t,
                    created_at: new Date().toISOString()
                  });
                  saveNotes(notesArr);
                  simulateTyping();
                  setTimeout(function() {
                    injectBotReply(`✅ Got it! Saved under <strong>${cat}</strong> ${CATEGORY_EMOJI[cat]}<br><small>"${t}"</small>`);
                  }, 1500);
                }, 200);
              })(text);
            }
          } else {
            console.log('🤖 [SaveNote] Not a self-chat. Skipping.');
          }
        } else {
          console.log('🤖 [SaveNote] Conversation header not found.');
        }
      }
    } catch (e) {
      console.error('🤖 [SaveNote] Error processing new elements:', e);
    }
  }
  
  // ===== Init =====
  setInterval(hijackIdentity, 1500);
  
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      for (var j = 0; j < mutation.addedNodes.length; j++) {
        var node = mutation.addedNodes[j];
        if (node.nodeType === Node.ELEMENT_NODE) {
          processNewElements(node);
        }
      }
    }
  });
  
  var app = document.querySelector('#app') || document.body;
  if (app) observer.observe(app, { childList: true, subtree: true });
  
  console.log(`🤖 ${BOT_NAME} Pixel-Perfect Native Bookmarklet Ready`);
})();
