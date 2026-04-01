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
  var TAIL_SVG = `<svg viewBox="0 0 8 13" width="8" height="13"><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>`;

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
            injectBotReply('✅ Got it! Saved under <strong>' + category + '</strong> ' + CATEGORY_EMOJI[category] + '<br><small>"' + escapeHtml(text) + '"</small>');
            resolve(response.note);
          }, 1500);
        } else {
          console.log('🤖 [SaveNote] Save failed, response:', response);
        }
      });
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    // Direct matches
    if (cleanText === 'you' ||
        cleanText === '(you)' ||
        cleanText === 'me' ||
        cleanText === 'yourself' ||
        cleanText === 'אני' ||
        cleanText === 'את' ||
        cleanText === 'אתה') {
      return true;
    }
    // Partial matches - phone number with "(You)" suffix, or Hebrew equivalents
    if (cleanText.includes('(you)') ||
        cleanText.includes('(את)') ||
        cleanText.includes('(אני)') ||
        cleanText.includes('(אתה)') ||
        cleanText.includes('chat with yourself') ||
        cleanText.includes('notes to self') ||
        cleanText.includes('message yourself')) {
      return true;
    }
    // Ends with " you" or "(you)" — this catches "+972 54-484-4125 (You)" 
    if (cleanText.endsWith(' you') || 
        cleanText.endsWith('(you)') ||
        /\(you\)\s*$/.test(cleanText)) {
      return true;
    }
    // Already hijacked by our extension
    if (cleanText.includes(BOT_NAME.toLowerCase()) || cleanText.includes('savenote')) {
      return true;
    }
    return false;
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

    // Rename 'You' in sidebar and header — scan ALL spans broadly
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
        if (titleAttr && titleAttr !== BOT_NAME) {
          el.setAttribute('title', BOT_NAME);
        }
        if (!el.classList.contains('sn-sidebar-identity')) {
          el.classList.add('sn-sidebar-identity');
        }
        
        // Try to replace avatar in sidebar or header
        var parent = el.closest('[data-testid="cell-frame-container"]') || el.closest('header');
        if (parent) {
          var avatarContainer = parent.querySelector('[data-testid="avatar-img-container"]') ||
                                parent.querySelector('img[draggable="false"]')?.parentElement;
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
    var main = document.querySelector('#main');
    if (!main) return;
    
    var header = findHeader(main);
    if (!header) return;

    var titleEl = findTitleElement(header);
    if (titleEl && (titleEl.textContent === BOT_NAME || isSelfChatTitle(titleEl.textContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase()))) {
      var subtitleContainer = header.querySelector('[data-testid="conversation-info-header-subtitle"]') ||
                               header.querySelector('[data-testid="chat-subtitle"]') ||
                               header.querySelector('span[title="click here for contact info"]')?.parentElement;
      if (subtitleContainer) {
        var oldHTML = subtitleContainer.innerHTML;
        subtitleContainer.innerHTML = '<span class="sn-typing-text" style="color:#008069 !important;font-size:13px !important;">typing...</span>';
        setTimeout(function() {
          subtitleContainer.innerHTML = oldHTML;
        }, 1400);
      }
    }

    // Sidebar typing
    var chatTitles = document.querySelectorAll('.sn-sidebar-identity');
    chatTitles.forEach(function(el) {
      var parent = el.closest('[data-testid="cell-frame-container"]');
      if (parent) {
        var lastMsgContainer = parent.querySelector('[data-testid="last-msg-status"]');
        if (lastMsgContainer) lastMsgContainer = lastMsgContainer.parentNode;
        if (lastMsgContainer && !lastMsgContainer.dataset.snTyping) {
          var oldHTML = lastMsgContainer.innerHTML;
          lastMsgContainer.innerHTML = '<span class="sn-typing-text" style="color:#008069 !important;font-size:13px !important;">typing...</span>';
          lastMsgContainer.dataset.snTyping = 'true';
          setTimeout(function() {
            lastMsgContainer.innerHTML = oldHTML;
            delete lastMsgContainer.dataset.snTyping;
          }, 1400);
        }
      }
    });
  }

  // ===== Header Finding Utilities =====
  function findHeader(mainEl) {
    // Strategy 1: Direct header element in #main
    var header = mainEl.querySelector('header');
    if (header) return header;
    
    // Strategy 2: Conversation header by test ID
    header = mainEl.querySelector('[data-testid="conversation-header"]');
    if (header) return header;
    
    // Strategy 3: Any element with role="banner" inside main
    header = mainEl.querySelector('[role="banner"]');
    if (header) return header;
    
    // Strategy 4: First child of #main is often the header area
    var firstChild = mainEl.firstElementChild;
    if (firstChild) {
      // Look for spans with title attribute which indicate the contact name
      var spanWithTitle = firstChild.querySelector('span[title]');
      if (spanWithTitle) return firstChild;
    }
    
    // Strategy 5: Search globally
    header = document.querySelector('[data-testid="conversation-header"]') ||
             document.querySelector('#main header') ||
             document.querySelector('#main [role="banner"]');
    
    return header;
  }

  function findTitleElement(header) {
    // Try multiple selectors in order of specificity
    return header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
           header.querySelector('[data-testid="contact-name"]') ||
           header.querySelector('span[title]') ||
           header.querySelector('span[dir="auto"]');
  }

  // ===== Bot Reply Injection =====
  function injectBotReply(html) {
    // Find the scrollable message container
    var chatPane = document.querySelector('[data-testid="conversation-panel-body"]') ||
                   document.querySelector('div[role="region"][aria-label*="Message"]') ||
                   document.querySelector('[data-testid="conversation-panel-messages"]') ||
                   document.querySelector('#main .copyable-area [role="application"]') ||
                   document.querySelector('#main .copyable-area');

    if (!chatPane) {
      console.log('🤖 [SaveNote] Chat pane not found for reply injection.');
      return;
    }

    var isDark = document.body.className.includes('dark') || 
                 document.body.getAttribute('data-theme') === 'dark';

    var bubbleBg = isDark ? '#202c33' : '#ffffff';
    var bubbleColor = isDark ? '#e9edef' : '#111b21';
    var nameColor = isDark ? '#00a884' : '#008069';
    var timeColor = isDark ? '#8696a0' : '#667781';
    var tailColor = isDark ? '#202c33' : '#ffffff';

    var nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Build the row container
    var row = document.createElement('div');
    row.className = 'sn-bot-msg-row';
    row.setAttribute('style', 'display:flex !important;flex-direction:column !important;width:100% !important;margin-bottom:2px !important;align-items:flex-start !important;');

    // Build the wrapper (holds tail + bubble)
    var wrapper = document.createElement('div');
    wrapper.className = 'sn-bot-bubble-wrapper';
    wrapper.setAttribute('style', 'position:relative !important;display:flex !important;max-width:65% !important;margin-left:63px !important;margin-bottom:8px !important;margin-top:8px !important;');

    // Tail SVG
    var tail = document.createElement('span');
    tail.className = 'sn-bot-tail';
    tail.setAttribute('style', 'position:absolute !important;top:0 !important;left:-8px !important;width:8px !important;height:13px !important;color:' + tailColor + ' !important;z-index:100 !important;display:block !important;');
    tail.innerHTML = TAIL_SVG;

    // Bubble
    var bubble = document.createElement('div');
    bubble.className = 'sn-bot-bubble';
    bubble.setAttribute('style', 'background-color:' + bubbleBg + ' !important;border-radius:0 7.5px 7.5px 7.5px !important;padding:6px 7px 8px 9px !important;box-shadow:0 1px 0.5px rgba(11,20,26,0.13) !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important;color:' + bubbleColor + ' !important;font-size:14.2px !important;line-height:19px !important;display:flex !important;flex-direction:column !important;min-width:120px !important;max-width:100% !important;');

    // Bot name
    var name = document.createElement('div');
    name.className = 'sn-bot-name';
    name.setAttribute('style', 'font-size:12.8px !important;font-weight:500 !important;color:' + nameColor + ' !important;margin-bottom:2px !important;line-height:22px !important;display:block !important;');
    name.textContent = BOT_NAME;

    // Message text
    var text = document.createElement('div');
    text.className = 'sn-bot-text';
    text.setAttribute('style', 'word-break:break-word !important;white-space:pre-wrap !important;margin-bottom:4px !important;color:' + bubbleColor + ' !important;font-size:14.2px !important;line-height:19px !important;display:block !important;');
    text.innerHTML = html;

    // Time meta
    var meta = document.createElement('div');
    meta.className = 'sn-bot-meta';
    meta.setAttribute('style', 'display:flex !important;justify-content:flex-end !important;align-items:center !important;float:right !important;margin-left:14px !important;');

    var time = document.createElement('span');
    time.className = 'sn-bot-time';
    time.setAttribute('style', 'font-size:11px !important;color:' + timeColor + ' !important;margin-top:3px !important;display:inline !important;');
    time.textContent = nowStr;

    // === ASSEMBLE (this was broken before — wrapper was never appended to row) ===
    meta.appendChild(time);
    bubble.appendChild(name);
    bubble.appendChild(text);
    bubble.appendChild(meta);
    wrapper.appendChild(tail);
    wrapper.appendChild(bubble);
    row.appendChild(wrapper);

    // Find the best insertion point inside the chat pane
    var list = chatPane.querySelector('[role="list"]') || chatPane;
    if (list === chatPane && chatPane.firstElementChild) {
      list = chatPane.firstElementChild;
    }
    list.appendChild(row);

    console.log('🤖 [SaveNote] Bot reply injected successfully.');

    // Scroll to bottom
    setTimeout(function() {
      var scrollContainer = chatPane;
      var el = chatPane;
      for (var i = 0; i < 5; i++) {
        if (el && el.scrollHeight > el.clientHeight) {
          scrollContainer = el;
          break;
        }
        el = el.parentElement;
      }
      scrollContainer.scrollTop = scrollContainer.scrollHeight + 1000;
      chatPane.scrollTop = chatPane.scrollHeight + 1000;
    }, 150);
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
          var list = books.slice(0, 5).map(function(b) { return '• ' + escapeHtml(b.summary); }).join('<br>');
          injectBotReply('📚 <strong>Here are the last few books you read:</strong><br>' + list);
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
          injectBotReply('🅿️ <strong>Last parking spot found:</strong><br>"' + escapeHtml(parking.raw_message) + '"<br><small>Saved ' + new Date(parking.created_at).toLocaleTimeString() + '</small>');
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
          var list = shopping.map(function(s) { return '• ' + escapeHtml(s.summary); }).join('<br>');
          injectBotReply('🛒 <strong>Your shopping list:</strong><br>' + list);
        }
      }, 1500);
      return true;
    }

    if (lower.match(/\b(help|hi|hello|start)\b/)) {
      simulateTyping();
      setTimeout(function() {
        injectBotReply('👋 <strong>Hi! I\'m ' + BOT_NAME + '.</strong><br>I\'m your personal memory assistant. Just message me anything you want to remember, and I\'ll categorize it for you!<br><br>Ask me:<br>• "What books did I read?"<br>• "Where did I park?"<br>• "What\'s on my shopping list?"');
      }, 1500);
      return true;
    }

    return false;
  }

  // ===== WhatsApp Web Message Observer =====
  function startObservers() {
    // 1. Identity Hijacker Interval
    setInterval(hijackIdentity, 2000);
    // Run once immediately
    hijackIdentity();

    // 2. Fallback polling for message interception
    setInterval(function() {
      var main = document.getElementById('main');
      if (main) processNewElements(main);
    }, 1200);

    // 3. Message Mutation Observer on body
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Only process if the node is inside #main to avoid sidebar noise
            if (node.closest && node.closest('#main')) {
              processNewElements(node);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log('🤖 [SaveNote] Observers started.');
  }

  function processNewElements(el) {
    if (!el.querySelectorAll) return;

    var msgContainers = [
      ...el.querySelectorAll('[data-testid="msg-container"], div[data-id], .message-out, [role="row"]'),
    ];
    
    // Also check if el itself matches
    if (el.matches && el.matches('[data-testid="msg-container"], div[data-id], .message-out, [role="row"]')) {
      msgContainers.push(el);
    }

    for (var i = 0; i < msgContainers.length; i++) {
      var container = msgContainers[i];
      
      // CRITICAL: Only process messages in the main conversation pane
      if (!container.closest('#main') && !container.closest('[data-testid="conversation-panel-body"]')) {
        continue;
      }

      // Skip our own bot replies
      if (container.closest('.sn-bot-msg-row') || container.classList.contains('sn-bot-msg-row')) {
        continue;
      }

      // === Determine if outgoing ===
      var dataId = container.getAttribute('data-id');
      var isOutgoingId = dataId && dataId.startsWith('true_');
      var isOutgoingClass = !!(container.closest('.message-out') || container.classList.contains('message-out'));
      var hasOutgoingCheck = !!(container.querySelector('[data-icon="msg-dblcheck"]') || 
                               container.querySelector('[data-icon="msg-check"]') ||
                               container.querySelector('[data-testid="msg-dblcheck"]') ||
                               container.querySelector('[data-testid="msg-check"]'));
      
      var isOutgoing = isOutgoingId || isOutgoingClass || hasOutgoingCheck;

      if (!isOutgoing) continue;

      // === Extract text ===
      var text = extractMessageText(container);
      if (!text || text.length < 2) continue;

      // Create a unique key combining data-id (if available) and text
      var msgKey = (dataId || '') + '||' + text;
      if (lastProcessedMessages.has(msgKey)) continue;
      lastProcessedMessages.add(msgKey);
      
      // Keep the set from growing unbounded
      if (lastProcessedMessages.size > 200) {
        var iter = lastProcessedMessages.values();
        for (var k = 0; k < 100; k++) iter.next();
        // Rebuild with only the newer half
        var newSet = new Set();
        var val = iter.next();
        while (!val.done) { newSet.add(val.value); val = iter.next(); }
        lastProcessedMessages = newSet;
      }

      console.log('🤖 [SaveNote] Intercepted new outgoing message:', text);

      // Use closure to capture text value
      (function(messageText) {
        checkSelfChat().then(function(isSelf) {
          if (isSelf) {
            console.log('🤖 [SaveNote] Self-chat confirmed! Processing:', messageText);
            if (!handleCommand(messageText)) {
              setTimeout(function() { saveNote(messageText); }, 200);
            }
          } else {
            console.log('🤖 [SaveNote] Not a self-chat. Skipping.');
          }
        });
      })(text);
    }
  }

  function extractMessageText(container) {
    // Try the most specific selectors first
    var selectableText = container.querySelector('.selectable-text [data-testid="quoted-message"] ~ span') ||
                         container.querySelector('span.selectable-text.copyable-text span') ||
                         container.querySelector('.selectable-text span[dir]') ||
                         container.querySelector('.selectable-text span') ||
                         container.querySelector('.selectable-text');
    
    if (selectableText) {
      var text = selectableText.textContent || '';
      return text.replace(/\s*\d{1,2}:\d{2}(\s*[ap]m)?$/i, '').trim();
    }

    // Try copyable-text with data-pre-plain-text attribute
    var copyable = container.querySelector('.copyable-text[data-pre-plain-text]');
    if (copyable) {
      // The actual message is in the selectable-text child
      var inner = copyable.querySelector('.selectable-text span') || copyable.querySelector('.selectable-text');
      if (inner) {
        return inner.textContent.replace(/\s*\d{1,2}:\d{2}(\s*[ap]m)?$/i, '').trim();
      }
    }

    // Fallback: clone and strip metadata
    var clone = container.cloneNode(true);
    var metas = clone.querySelectorAll('[data-testid="msg-meta"], .metadata, time, [data-testid="msg-dblcheck"], [data-testid="msg-check"]');
    for (var k = 0; k < metas.length; k++) {
      metas[k].remove();
    }
    var text = clone.textContent || '';
    text = text.replace(/\s*\d{1,2}:\d{2}(\s*[ap]m)?$/i, '').trim();
    return text;
  }

  // ===== Self-Chat Detection =====
  async function checkSelfChat() {
    var main = document.querySelector('#main');
    if (!main) {
      console.log('🤖 [SaveNote] #main element not found.');
      return false;
    }

    var header = findHeader(main);
    
    if (!header) {
      console.log('🤖 [SaveNote] Header not found. Trying broader search...');
      // Last resort: look for ANY header-like structure in #main
      var allDivs = main.querySelectorAll('div');
      for (var d = 0; d < Math.min(allDivs.length, 10); d++) {
        var spanInDiv = allDivs[d].querySelector('span[title]');
        if (spanInDiv) {
          header = allDivs[d];
          console.log('🤖 [SaveNote] Found header via broad div search.');
          break;
        }
      }
    }

    if (!header) {
      console.log('🤖 [SaveNote] Header truly not found. Dumping #main children count:', main.children.length);
      // Emergency fallback: check if the hijacker has already identified this as self-chat
      if (document.querySelector('.sn-sidebar-identity')) {
        console.log('🤖 [SaveNote] Sidebar identity exists — assuming self-chat.');
        return true;
      }
      return false;
    }

    // Strategy 1: Check specific title elements
    var titleEl = findTitleElement(header);
    
    if (titleEl) {
      var title = titleEl.textContent || '';
      var titleAttr = titleEl.getAttribute('title') || '';
      var cleanTx = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var cleanAttr = titleAttr.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      
      console.log('🤖 [SaveNote] Chat title text:', JSON.stringify(title), 'clean:', JSON.stringify(cleanTx), 'attr:', JSON.stringify(cleanAttr));

      if (title.includes(BOT_NAME) || isSelfChatTitle(cleanTx) || isSelfChatTitle(cleanAttr)) {
        return true;
      }
    }

    // Strategy 2: Scan ALL spans in the header
    var allSpans = header.querySelectorAll('span');
    for (var i = 0; i < allSpans.length; i++) {
      var spanText = (allSpans[i].textContent || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var spanTitle = (allSpans[i].getAttribute('title') || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      if (isSelfChatTitle(spanText) || isSelfChatTitle(spanTitle)) {
        console.log('🤖 [SaveNote] Self-chat detected via header span scan:', allSpans[i].textContent);
        return true;
      }
      if ((allSpans[i].textContent || '').includes(BOT_NAME)) {
        return true;
      }
    }

    // Strategy 3: Check the full header text
    var headerText = header.textContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
    console.log('🤖 [SaveNote] Full header text:', JSON.stringify(headerText.substring(0, 100)));
    if (isSelfChatTitle(headerText) || headerText.includes(BOT_NAME.toLowerCase())) {
      console.log('🤖 [SaveNote] Self-chat detected via full header text.');
      return true;
    }

    // Strategy 4: Check if hijacker already marked a sidebar identity as active
    var sidebarIdentities = document.querySelectorAll('.sn-sidebar-identity');
    if (sidebarIdentities.length > 0) {
      for (var j = 0; j < sidebarIdentities.length; j++) {
        var cell = sidebarIdentities[j].closest('[data-testid="cell-frame-container"]');
        if (cell) {
          var listItem = cell.closest('[aria-selected="true"]') || 
                         cell.closest('[data-testid="chat-list-item"]');
          if (listItem && listItem.getAttribute('aria-selected') === 'true') {
            console.log('🤖 [SaveNote] Self-chat detected via active sidebar identity.');
            return true;
          }
        }
      }
      // If sidebar has the identity but we can't confirm it's selected,
      // check if only one chat is open (always the case in self-chat use)
      console.log('🤖 [SaveNote] Sidebar identity exists — assuming self-chat.');
      return true;
    }

    // Strategy 5: Check the conversation panel's data attributes
    var conversationPanel = main.querySelector('[data-testid="conversation-panel"]') || main;
    var panelDataId = conversationPanel.getAttribute('data-id') || '';
    // Self-chat data-ids often contain the user's own number
    if (panelDataId && panelDataId.includes('@s.whatsapp.net')) {
      // This is a DM — could be self-chat. We'll check msg patterns.
      var outMsgs = main.querySelectorAll('.message-out, [data-id^="true_"]');
      var inMsgs = main.querySelectorAll('.message-in, [data-id^="false_"]');
      // In self-chat, ALL messages show as outgoing
      if (outMsgs.length > 0 && inMsgs.length === 0) {
        console.log('🤖 [SaveNote] Self-chat detected: all messages are outgoing.');
        return true;
      }
    }

    console.log('🤖 [SaveNote] Not a self-chat. No indicators found.');
    return false;
  }

  // ===== Initialize =====
  function init() {
    console.log('🤖 ' + BOT_NAME + ' Pixel-Perfect Native Bot Mode activated');
    loadNotes().then(function() {
      startObservers();
    });
  }

  // Wait for DOM — more robust with multiple attempts
  function waitForWhatsApp() {
    // Check if WhatsApp Web has loaded its main structure
    var sidePanel = document.querySelector('[data-testid="chat-list"]') || 
                     document.querySelector('[aria-label="Chat list"]') ||
                     document.querySelector('#pane-side');
    if (sidePanel) {
      console.log('🤖 [SaveNote] WhatsApp Web detected. Initializing...');
      init();
    } else {
      console.log('🤖 [SaveNote] Waiting for WhatsApp Web to load...');
      setTimeout(waitForWhatsApp, 2000);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(waitForWhatsApp, 1500);
  } else {
    window.addEventListener('load', function() { setTimeout(waitForWhatsApp, 1500); });
  }
})();
