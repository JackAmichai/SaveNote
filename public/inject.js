/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Pixel-Perfect Native Bot Mode without Extension
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

  // Self-chat detection helper
  function isSelfChatTitle(cleanText) {
    var selfStrings = [
      'you', '(you)', 'me', 'yourself', 'אני', 'את', 'אתה',
      'message yourself', 'הודעה לעצמך', 'שלח הודעה לעצמך',
      'chat with yourself', 'notes to self', 'my notes',
      'הערות לעצמי', 'מזכרות', 'יומן'
    ];
    
    if (selfStrings.includes(cleanText)) return true;
    
    for (var i = 0; i < selfStrings.length; i++) {
      if (cleanText.includes(selfStrings[i])) return true;
    }
    
    return cleanText.endsWith(' you') || /\(you\)\s*$/.test(cleanText);
  }
  
  function categorize(t){for(var k in CATEGORY_KEYWORDS)if(CATEGORY_KEYWORDS[k].test(t))return k;return 'other';}
  function loadNotes(){try{return JSON.parse(localStorage.getItem('savenote_data'))||[];}catch(e){return [];}}
  function saveNotes(n){localStorage.setItem('savenote_data',JSON.stringify(n));}

  // SVG for bot avatar
  var BOT_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;
  // The little point "tail" of an incoming msg
  var TAIL_SVG = `<svg viewBox="0 0 8 13" width="8" height="13" class=""><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>`;

  // ===== Identity Hijacker =====
  function hijackIdentity() {
    var bodyClass = document.body.className;
    if (bodyClass.includes('dark')) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }

    var chatTitles = document.querySelectorAll('span[title], [data-testid="contact-name"], [data-testid="conversation-info-header-chat-title"], [data-testid="chat-title"]');
    chatTitles.forEach(function(el) {
      var txt = el.textContent || '';
      var titleAttr = el.getAttribute('title') || '';
      var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var cleanTitle = titleAttr.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      
      var selfChat = isSelfChatTitle(cleanTx) || isSelfChatTitle(cleanTitle) || txt.includes(BOT_NAME);

      if (selfChat) {
        if (txt !== BOT_NAME) {
           el.textContent = BOT_NAME;
        }
        if (!el.classList.contains('sn-sidebar-identity')) {
          el.classList.add('sn-sidebar-identity');
        }
        
        var parent = el.closest('[data-testid="cell-frame-container"]') || 
                     el.closest('header') || 
                     el.closest('[data-testid="conversation-header"]') ||
                     el.closest('[role="banner"]');
        
        if (parent) {
          parent.dataset.snIsSelf = 'true';
          var avatarContainer = parent.querySelector('[data-testid="avatar-img-container"]') || 
                                parent.querySelector('div[role="button"] img')?.parentElement;
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
      if (headerTitle) {
          var titleText = headerTitle.textContent;
          if (titleText === BOT_NAME) {
            var subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]') ||
                                     document.querySelector('header [data-testid="chat-subtitle"]');
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
  }

  // ===== Bot Reply Injection =====
  function injectBotReply(html) {
    var chatPane = document.querySelector('div[role="region"][aria-label="Message list"]') || 
                   document.querySelector('[data-testid="conversation-panel-body"]') || 
                   document.querySelector('[data-testid="conversation-panel-messages"]') ||
                   document.querySelector('#main .copyable-area [role="application"]') ||
                   document.querySelector('#main .copyable-area');

    if (!chatPane) {
        console.log('🤖 [SaveNote] Chat pane not found.');
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
    if (list === chatPane && chatPane.firstElementChild) {
        list = chatPane.firstElementChild;
    }
    list.appendChild(row);

    console.log('🤖 [SaveNote] Bot reply injected successfully.');

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
    if (lower.match(/\b(help|hi|hello)\b/)) {
        simulateTyping();
        setTimeout(function() {
            injectBotReply(`👋 Hi, I'm ${BOT_NAME}. Message me anything to remember it.<br><br>Ask me:<br>• What books did I read?<br>• Where did I park?`);
        }, 1500);
        return true;
    }
    return false;
  }

  function processNewElements(el) {
    var msgContainers = el.querySelectorAll ? [
      ...el.querySelectorAll('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-out, .message-in'),
      ...(el.matches && el.matches('[data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-out, .message-in') ? [el] : []),
    ] : [];

    for (var i = 0; i < msgContainers.length; i++) {
      var container = msgContainers[i];
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
                          container.querySelector('span.copyable-text') ||
                          container.querySelector('.copyable-text');

      if (!textWrapper) { textWrapper = container; }

      var text = "";
      if (textWrapper.querySelector('span.selectable-text')) {
          text = textWrapper.querySelector('span.selectable-text').textContent;
      } else {
          var clone = textWrapper.cloneNode(true);
          var metas = clone.querySelectorAll('[data-testid="msg-meta"], .metadata, .copyable-text:not(.selectable-text), span[dir="auto"]:last-child');
          for (var k = 0; k < metas.length; k++) {
              metas[k].remove();
          }
          text = clone.textContent;
      }
      
      text = text.trim();
      text = text.replace(/\s*\d{1,2}:\d{2}(\s*[ap]m)?$/i, '');

      if (!text || text.length < 2) continue;
      if (lastProcessedMessages.has(text)) continue;
      lastProcessedMessages.add(text);
      console.log('🤖 [SaveNote] Intercepted outgoing message:', text);

      var isSelf = checkSelfChatSync();
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
          console.log('🤖 [SaveNote] NOT a self-chat. (Header title was likely not recognized)');
      }
    }
  }

  // ===== Self-Chat Sync Check =====
  function checkSelfChatSync() {
    var main = document.querySelector('#main') || 
               document.querySelector('[data-testid="conversation-panel-body"]') || 
               document.querySelector('div[role="main"]');
    
    if (!main) {
        console.log('🤖 [SaveNote] Main chat pane not found.');
        var allHeaders = document.querySelectorAll('header, [data-testid="conversation-header"], [role="banner"]');
        for (var h = 0; h < allHeaders.length; h++) {
            if (isHeaderSelfChat(allHeaders[h])) return true;
        }
        return false;
    }

    var header = main.querySelector('header') || 
                 main.querySelector('[data-testid="conversation-header"]') || 
                 main.querySelector('[role="banner"]') ||
                 document.querySelector('header') || 
                 document.querySelector('[data-testid="conversation-header"]');
    
    if (!header) {
        console.log('🤖 [SaveNote] Header element not found inside main pane.');
        var possibleTitles = main.querySelectorAll('[data-testid="conversation-info-header-chat-title"], span[title], [data-testid="contact-name"]');
        for (var t = 0; t < possibleTitles.length; t++) {
            var txt = possibleTitles[t].textContent || possibleTitles[t].getAttribute('title') || '';
            var clean = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
            console.log('🤖 [SaveNote] Checking possible title:', clean);
            if (txt.includes(BOT_NAME) || isSelfChatTitle(clean)) return true;
        }
        return false;
    }

    return isHeaderSelfChat(header);
  }

  function isHeaderSelfChat(header) {
    if (header.dataset.snIsSelf === 'true') return true;
    
    var titleEl = header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
                    header.querySelector('span[title]') ||
                    header.querySelector('[data-testid="contact-name"]') ||
                    header.querySelector('[data-testid="chat-title"]');
    
    if (titleEl) {
        var title = titleEl.textContent || titleEl.getAttribute('title') || '';
        var clean = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        console.log('🤖 [SaveNote] Header title found:', JSON.stringify(clean));
        if (title.includes(BOT_NAME) || isSelfChatTitle(clean)) return true;
    }

    var children = header.querySelectorAll('span, div[title], div[role="button"]');
    for (var i = 0; i < children.length; i++) {
        var text = (children[i].textContent || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        var attr = (children[i].getAttribute('title') || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        if (isSelfChatTitle(text) || isSelfChatTitle(attr) || text.includes(BOT_NAME.toLowerCase())) {
            console.log('🤖 [SaveNote] Self-chat detected in header child:', text || attr);
            return true;
        }
    }

    var fullText = header.textContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
    console.log('🤖 [SaveNote] Full header text:', fullText);
    if (isSelfChatTitle(fullText) || fullText.includes(BOT_NAME.toLowerCase())) return true;

    return false;
  }

  // ===== Init =====
  setInterval(hijackIdentity, 1500);
  setInterval(function() {
    processNewElements(document.getElementById('main') || document.body);
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
  console.log(`🤖 ${BOT_NAME} Pixel-Perfect Native Bookmarklet Ready`);
})();
