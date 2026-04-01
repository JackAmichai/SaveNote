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
    if (!cleanText) return false;
    var exact = ['you', '(you)', 'me', 'yourself', 'אני', 'את', 'אתה', 'message yourself', 'chat with yourself', 'notes to self', 'my notes'];
    if (exact.includes(cleanText)) return true;
    
    // Matches suffix formats like "+972 54... (You)"
    if (cleanText.endsWith('(you)') || cleanText.endsWith('(את)') || cleanText.endsWith('(אני)') || cleanText.endsWith('(אתה)')) return true;
    if (cleanText.endsWith(' you')) return true;
    
    return false;
  }

  // ===== UI: Bot Identity Hijacker =====
  function hijackIdentity() {
    var bodyClass = document.body.className;
    if (bodyClass.includes('dark')) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }

    // Only target actual titles, skip message previews
    var chatTitles = document.querySelectorAll('[data-testid="cell-frame-title"] span[title], [data-testid="contact-name"], [data-testid="conversation-info-header-chat-title"], [data-testid="chat-title"]');
    chatTitles.forEach(function(el) {
      var txt = el.textContent || '';
      var titleAttr = el.getAttribute('title') || '';
      var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var cleanTitle = titleAttr.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      
      var isSelfChat = isSelfChatTitle(cleanTx) || isSelfChatTitle(cleanTitle) || txt.includes(BOT_NAME);

      if (isSelfChat) {
        if (txt !== BOT_NAME) { el.textContent = BOT_NAME; }
        if (!el.classList.contains('sn-sidebar-identity')) { el.classList.add('sn-sidebar-identity'); }
        
        var parent = el.closest('[data-testid="cell-frame-container"]') || el.closest('header') || el.closest('[data-testid="conversation-header"]') || el.closest('[role="banner"]');
        if (parent) {
          parent.dataset.snIsSelf = 'true';
          var avatarContainer = parent.querySelector('[data-testid="avatar-img-container"]') || parent.querySelector('div[role="button"] img')?.parentElement;
          if (avatarContainer && !parent.dataset.snHijacked) {
            avatarContainer.innerHTML = BOT_SVG;
            parent.dataset.snHijacked = 'true';
          }
        }
      }
    });
  }

  function simulateTyping() {
      var headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]') || 
                         document.querySelector('header span[title]');
      if (headerTitle && (headerTitle.textContent === BOT_NAME || isSelfChatTitle(headerTitle.textContent.toLowerCase()))) {
          var subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]') || document.querySelector('header [data-testid="chat-subtitle"]');
          if (subtitleContainer) {
              var oldHTML = subtitleContainer.innerHTML;
              subtitleContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
              setTimeout(function() { subtitleContainer.innerHTML = oldHTML; }, 1400);
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
  }

  function injectBotReply(html) {
    var chatPane = document.querySelector('div[role="region"][aria-label="Message list"]') || 
                   document.querySelector('[data-testid="conversation-panel-body"]') || 
                   document.querySelector('[data-testid="conversation-panel-messages"]') ||
                   document.querySelector('#main .copyable-area [role="application"]') ||
                   document.querySelector('#main .copyable-area');

    if (!chatPane) return;

    var isDark = document.body.className.includes('dark') || document.body.getAttribute('data-theme') === 'dark';
    var bubbleBg = isDark ? '#202c33' : '#ffffff';
    var bubbleColor = isDark ? '#e9edef' : '#111b21';
    var nameColor = isDark ? '#00a884' : '#008069';
    var timeColor = isDark ? '#8696a0' : '#667781';
    var tailColor = isDark ? '#202c33' : '#ffffff';
    var nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    var row = document.createElement('div');
    row.setAttribute('style', 'display:flex !important;flex-direction:column !important;width:100% !important;margin-bottom:2px !important;align-items:flex-start !important;');

    var wrapper = document.createElement('div');
    wrapper.setAttribute('style', 'position:relative !important;display:flex !important;max-width:65% !important;margin-left:63px !important;margin-bottom:8px !important;margin-top:8px !important;');

    var tail = document.createElement('span');
    tail.setAttribute('style', 'position:absolute !important;top:0 !important;left:-8px !important;width:8px !important;height:13px !important;color:' + tailColor + ' !important;z-index:100 !important;display:block !important;');
    tail.innerHTML = TAIL_SVG;

    var bubble = document.createElement('div');
    bubble.setAttribute('style', 'background-color:' + bubbleBg + ' !important;border-radius:0 7.5px 7.5px 7.5px !important;padding:6px 7px 8px 9px !important;box-shadow:0 1px 0.5px rgba(11,20,26,0.13) !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important;color:' + bubbleColor + ' !important;font-size:14.2px !important;line-height:19px !important;display:flex !important;flex-direction:column !important;min-width:120px !important;max-width:100% !important;');

    var name = document.createElement('div');
    name.setAttribute('style', 'font-size:12.8px !important;font-weight:500 !important;color:' + nameColor + ' !important;margin-bottom:2px !important;line-height:22px !important;display:block !important;');
    name.textContent = BOT_NAME;

    var text = document.createElement('div');
    text.setAttribute('style', 'word-break:break-word !important;white-space:pre-wrap !important;margin-bottom:4px !important;color:' + bubbleColor + ' !important;font-size:14.2px !important;line-height:19px !important;display:block !important;');
    text.innerHTML = html;

    var meta = document.createElement('div');
    meta.setAttribute('style', 'display:flex !important;justify-content:flex-end !important;align-items:center !important;float:right !important;margin-left:14px !important;');

    var time = document.createElement('span');
    time.setAttribute('style', 'font-size:11px !important;color:' + timeColor + ' !important;margin-top:3px !important;display:inline !important;');
    time.textContent = nowStr;

    meta.appendChild(time);
    bubble.appendChild(name);
    bubble.appendChild(text);
    bubble.appendChild(meta);
    wrapper.appendChild(tail);
    wrapper.appendChild(bubble);
    row.appendChild(wrapper);

    var list = chatPane.querySelector('[role="list"]') || chatPane;
    if (list === chatPane && chatPane.firstElementChild) { list = chatPane.firstElementChild; }
    list.appendChild(row);

    setTimeout(function() {
      var scrollContainer = chatPane;
      var el = chatPane;
      for (var i = 0; i < 5; i++) {
        if (el && el.scrollHeight > el.clientHeight) { scrollContainer = el; break; }
        el = el.parentElement;
      }
      scrollContainer.scrollTop = scrollContainer.scrollHeight + 1000;
      chatPane.scrollTop = chatPane.scrollHeight + 1000;
    }, 150);
  }

  function handleCommand(text) {
    var lower = text.toLowerCase();
    if (lower.includes('what') && lower.includes('book')) {
      var books = notes.filter(function(n) { return n.category === 'book'; });
      simulateTyping();
      setTimeout(function() {
          if (books.length === 0) injectBotReply("📚 You haven't saved any books yet!");
          else injectBotReply(`📚 <strong>Your books:</strong><br>${books.slice(0, 5).map(function(b) { return '• ' + b.summary; }).join('<br>')}`);
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
    if (lower.match(/\b(help|hi|hello)\b/)) {
      simulateTyping();
      setTimeout(function() {
          injectBotReply(`👋 Hi! I'm ${BOT_NAME}. Message me anything to remember it.`);
      }, 1500);
      return true;
    }
    return false;
  }

  var hasWelcomed = false;

  function startObservers() {
    setInterval(hijackIdentity, 1500);
    setInterval(function() { 
        processNewElements(document.getElementById('main') || document.body); 
        
        // Try injecting welcome message
        if (!hasWelcomed) {
            checkSelfChat().then(function(isSelf) {
                if (isSelf) {
                    hasWelcomed = true;
                    if (notes.length < 2) {
                        setTimeout(function() {
                            injectBotReply(`👋 <strong>Welcome to SaveNote AI!</strong><br><br>I'm your personal memory assistant. Just message me anything you want to remember (like a book, a parking spot, or an idea).<br><br>Type <strong>help</strong> to see what else I can do!`);
                        }, 1000);
                    }
                }
            });
        }
    }, 1000);
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) processNewElements(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function processNewElements(el) {
    var msgContainers = el.querySelectorAll ? [
      ...el.querySelectorAll('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-out, .message-in'),
      ...(el.matches && el.matches('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-out, .message-in') ? [el] : []),
    ] : [];

    for (var i = 0; i < msgContainers.length; i++) {
      var container = msgContainers[i];
      if (!container.closest('#main') && !container.closest('[data-testid="conversation-panel-body"]')) continue;

      var dataId = container.getAttribute('data-id');
      var isOutgoing = (dataId && dataId.startsWith('true_')) || container.closest('.message-out') || container.classList.contains('message-out') || container.querySelector('[data-icon="msg-dblcheck"]') || container.querySelector('[data-icon="msg-check"]');
      if (!isOutgoing) continue;

      var textWrapper = container.querySelector('.selectable-text span') || container.querySelector('.selectable-text') || container.querySelector('.copyable-text[data-pre-plain-text]') || container.querySelector('span.copyable-text') || container.querySelector('.copyable-text') || container;
      var text = "";
      if (textWrapper.querySelector('span.selectable-text')) {
          text = textWrapper.querySelector('span.selectable-text').textContent;
      } else {
          var clone = textWrapper.cloneNode(true);
          var metas = clone.querySelectorAll('[data-testid="msg-meta"], .metadata, .copyable-text:not(.selectable-text), span[dir="auto"]:last-child');
          for (var k = 0; k < metas.length; k++) metas[k].remove();
          text = clone.textContent;
      }
      text = text.trim().replace(/\s*\d{1,2}:\d{2}(\s*[ap]m)?$/i, '');

      if (!text || text.length < 2) continue;
      if (lastProcessedMessages.has(text)) continue;
      lastProcessedMessages.add(text);

      checkSelfChat().then(function(isSelf) {
        if (isSelf) {
          if (!handleCommand(text)) { setTimeout(function() { saveNote(text); }, 200); }
        }
      });
    }
  }

  async function checkSelfChat() {
    // Strategy 1: check the active chat in the sidebar
    var selectedSidebarItem = document.querySelector('[aria-selected="true"], [role="row"][aria-selected="true"]');
    if (selectedSidebarItem) {
        var titleSpan = selectedSidebarItem.querySelector('[data-testid="cell-frame-title"] span[title], [data-testid="contact-name"]');
        if (titleSpan) {
            var txt = titleSpan.textContent || titleSpan.getAttribute('title') || '';
            var clean = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
            if (txt.includes(BOT_NAME) || isSelfChatTitle(clean)) {
                return true;
            }
        }
    }

    // Strategy 2: check inside the main pane
    var main = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-body"]')?.parentElement || document.querySelector('div[role="main"]');
    var scope = main || document;

    var possibleTitles = scope.querySelectorAll('[data-testid="conversation-info-header-chat-title"], [data-testid="chat-title"], header span[title]');
    for (var t = 0; t < possibleTitles.length; t++) {
        var el = possibleTitles[t];
        if (el.closest('[data-testid="chat-list"]') || el.closest('#pane-side')) continue;
        
        var txt = el.textContent || el.getAttribute('title') || '';
        var clean = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        if (txt.includes(BOT_NAME) || isSelfChatTitle(clean)) {
            return true;
        }
    }
    return false;
  }

  function init() {
    loadNotes().then(function() { startObservers(); });
  }

  if (document.readyState === 'complete') { setTimeout(init, 2000); }
  else { window.addEventListener('load', function() { setTimeout(init, 2000); }); }
})();
