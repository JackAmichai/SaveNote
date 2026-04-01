/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Pixel-Perfect Native Bot Mode without Extension
 */

(function () {
  'use strict';

  // ===== Instructions UI =====
  function showInstructions() {
    var id = 'sn-instructions-overlay';
    if (document.getElementById(id)) return;

    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.setAttribute('style', 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;');
    
    var modal = document.createElement('div');
    modal.setAttribute('style', 'background:white;width:90%;max-width:450px;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);animation:sn-pop 0.3s ease-out;');
    
    var header = document.createElement('div');
    header.setAttribute('style', 'background:#008069;color:white;padding:20px;text-align:center;');
    header.innerHTML = '<h2 style="margin:0;font-size:22px;">💬 SaveNote AI Active</h2>';
    
    var content = document.createElement('div');
    content.setAttribute('style', 'padding:25px;color:#3b4a54;line-height:1.6;');
    content.innerHTML = `
      <p style="margin-top:0;font-weight:600;font-size:16px;">How to use your memory assistant:</p>
      <div style="margin-bottom:15px;">
        <strong style="color:#008069;">1. Save Memories</strong><br>
        Just send yourself a message like: <br>
        <em style="color:#667781;">"I parked on level 3 section B"</em>
      </div>
      <div style="margin-bottom:15px;">
        <strong style="color:#008069;">2. Recall Instantly</strong><br>
        Ask a question anytime: <br>
        <em style="color:#667781;">"Where did I park my car?"</em>
      </div>
      <div style="margin-bottom:20px;background:#f0f2f5;padding:10px;border-radius:8px;font-size:13px;">
        💡 <strong>Pro Tip:</strong> Click the bookmark again while in any chat to <strong>Force Activate</strong> SaveNote for that specific conversation.
      </div>
    `;
    
    var footer = document.createElement('div');
    footer.setAttribute('style', 'padding:0 25px 25px;text-align:center;');
    
    var btn = document.createElement('button');
    btn.textContent = 'Got it, thanks!';
    btn.setAttribute('style', 'background:#008069;color:white;border:none;padding:12px 30px;border-radius:24px;font-weight:600;cursor:pointer;font-size:15px;width:100%;');
    btn.onclick = function() { overlay.remove(); };
    
    // Add CSS animation
    var style = document.createElement('style');
    style.innerHTML = '@keyframes sn-pop { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }';
    document.head.appendChild(style);

    footer.appendChild(btn);
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // If already loaded, clicking again acts as "Force Activation" for the current chat
  if (window.__savenote_loaded) {
    console.log('🤖 [SaveNote] Re-clicked! Forcing activation for current chat...');
    var main = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-body"]');
    var header = (main && main.querySelector('header')) || document.querySelector('[data-testid="conversation-header"]');
    if (header) {
        header.dataset.snIsSelf = 'true';
        console.log('🤖 [SaveNote] Current chat FORCED to Bot Mode.');
        showInstructions();
    }
    return;
  }
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
  function isSelfChatTitle(txt) {
    if (!txt) return false;
    var clean = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
    var selfStrings = [
      'you', '(you)', 'me', 'yourself', 'אני', 'את', 'אתה',
      'message yourself', 'chat with yourself', 'notes to self', 'my notes',
      'הודעה לעצמך', 'שלח הודעה לעצמך', 'הערות לעצמי', 'מזכרות', 'יומן'
    ];
    if (selfStrings.includes(clean)) return true;
    for (var i = 0; i < selfStrings.length; i++) {
      if (clean.indexOf(selfStrings[i]) !== -1) return true;
    }
    return false;
  }

  function isSelfChatSync() {
    var header = document.querySelector('header, [data-testid="conversation-header"], [role="banner"], [data-testid="conversation-panel-header"]');
    if (!header) return false;
    if (header.dataset.snIsSelf === 'true') return true;
    var titleEl = header.querySelector('[title], [data-testid="conversation-info-header-chat-title"], [data-testid="chat-title"], span[dir="auto"]');
    if (!titleEl) return false;
    var txt = titleEl.getAttribute('title') || titleEl.textContent || '';
    return isSelfChatTitle(txt) || txt.indexOf(BOT_NAME) !== -1;
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

    var chatTitles = document.querySelectorAll('[data-testid="cell-frame-title"] span[title], [data-testid="contact-name"], [data-testid="conversation-info-header-chat-title"], [data-testid="chat-title"]');
    chatTitles.forEach(function(el) {
      var txt = el.textContent || '';
      var titleAttr = el.getAttribute('title') || '';
      var isSelfChat = isSelfChatTitle(txt) || isSelfChatTitle(titleAttr) || txt.indexOf(BOT_NAME) !== -1;

      if (isSelfChat) {
        if (txt !== BOT_NAME) { el.textContent = BOT_NAME; }
        if (!el.classList.contains('sn-sidebar-identity')) { el.classList.add('sn-sidebar-identity'); }
        
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
    wrapper.setAttribute('style', 'position:relative !important;display:flex !important;max-width:85% !important;margin-left:63px !important;margin-bottom:8px !important;margin-top:8px !important;');

    var tail = document.createElement('span');
    tail.setAttribute('style', 'position:absolute !important;top:0 !important;left:-8px !important;width:8px !important;height:13px !important;color:' + tailColor + ' !important;z-index:100 !important;display:block !important;');
    tail.innerHTML = TAIL_SVG;

    var bubble = document.createElement('div');
    bubble.setAttribute('style', 'background-color:' + bubbleBg + ' !important;border-radius:0 7.5px 7.5px 7.5px !important;padding:6px 7px 8px 9px !important;box-shadow:0 1px 0.5px rgba(11,20,26,0.13) !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important;color:' + bubbleColor + ' !important;font-size:14.2px !important;line-height:19px !important;display:flex !important;flex-direction:column !important;min-width:160px !important;max-width:100% !important;');

    var name = document.createElement('div');
    name.setAttribute('style', 'font-size:12.8px !important;font-weight:500 !important;color:' + nameColor + ' !important;margin-bottom:2px !important;line-height:22px !important;display:block !important;');
    name.textContent = BOT_NAME;

    var text = document.createElement('div');
    text.setAttribute('style', 'word-break:break-word !important;white-space:pre-wrap !important;margin-bottom:4px !important;color:' + bubbleColor + ' !important;font-size:14.2px !important;line-height:1.4 !important;display:block !important;');
    
    // Process category pills inside text
    var processedHtml = html;
    if (html.includes('[category-pill]')) {
      var badgeStyle = isDark ? 
        'background:rgba(255,255,255,0.1);color:#00a884;' : 
        'background:rgba(0,128,105,0.08);color:#008069;border:1px solid rgba(0,128,105,0.1);';
      var badgeHtml = `<span style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;font-weight:600;text-transform:uppercase;margin-left:8px;vertical-align:middle;${badgeStyle}">$1</span>`;
      processedHtml = html.replace(/\[category-pill\](.*?)\[\/category-pill\]/g, badgeHtml);
    }
    
    text.innerHTML = processedHtml;

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
    
    // Help & Conversational
    if (lower.match(/\b(how do i|interact|what can you do|features|how to use|help|hi|hello)\b/)) {
        simulateTyping();
        setTimeout(function() {
            injectBotReply(`👋 <strong>Hi, I'm ${BOT_NAME}.</strong><br><br>I organize your thoughts using AI. Just message me anything you want to remember:<br><i>"I parked on level 3"</i><br><br>Later, you can just ask me:<br><i>"Where did I park?"</i>`);
        }, 1500);
        return true;
    }
    
    // Broad Book Query
    if (lower.match(/\b(what|which|show|list)\b.*?\b(book|read|reading)\b/)) {
      var books = notes.filter(function(n) { return n.category === 'book'; });
      simulateTyping();
      setTimeout(function() {
          if (books.length === 0) injectBotReply("📚 You haven't saved any books yet. Send me a title to get started!");
          else injectBotReply(`📚 <strong>Your reading list:</strong><br><br>${books.slice(0, 5).map(function(b, i) { return (i+1) + '. ' + b.summary; }).join('<br>')}`);
      }, 1500);
      return true;
    }
    
    // Broad Parking/Location Query
    if (lower.match(/\b(where|what|show)\b.*?\b(park|parked|car|location)\b/)) {
      var p = notes.find(function(n) { return n.category === 'parking' || n.category === 'location'; });
      simulateTyping();
      setTimeout(function() {
          if (!p) injectBotReply("🅿️ No parking spot or location found. Did you forget to tell me?");
          else injectBotReply(`🔍 <strong>Here's what I found:</strong><br><br>${CATEGORY_EMOJI[p.category]} ${p.summary}`);
      }, 1500);
      return true;
    }
    
    // Broad Idea Query
    if (lower.match(/\b(what|show|list)\b.*?\b(idea|thoughts)\b/)) {
      var ideas = notes.filter(function(n) { return n.category === 'idea'; });
      simulateTyping();
      setTimeout(function() {
          if (ideas.length === 0) injectBotReply("💡 No ideas saved yet.");
          else injectBotReply(`💡 <strong>Your recent ideas:</strong><br><br>${ideas.slice(0, 5).map(function(i, idx) { return (idx+1) + '. ' + i.summary; }).join('<br>')}`);
      }, 1500);
      return true;
    }
        if (lower.match(/\b(what|show|list)\b.*?\b(shop|shopping|buy|list)\b/)) {
      var shopping = notes.filter(function(n) { return n.category === 'shopping'; });
      simulateTyping();
      setTimeout(function() {
          if (shopping.length === 0) injectBotReply("🛒 Shopping list is empty.");
          else injectBotReply(`🛒 <strong>Shopping list:</strong><br><br>${shopping.map(function(s, i) { return (i+1) + '. ' + s.summary; }).join('<br>')}`);
      }, 1500);
      return true;
    }

    return false;
  }



  function processNewElements(el) {
    // Basic Rate Limiting
    if (lastProcessedMessages.size > 200) lastProcessedMessages.clear();

    var msgContainers = el.querySelectorAll ? [
      ...el.querySelectorAll('[role="row"], [data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-out, .message-in'),
      ...(el.matches && el.matches('[role="row"], [data-testid="msg-container"], [data-testid="msg-row"], div[data-id], .message-out, .message-in') ? [el] : []),
    ] : [];

    for (var i = 0; i < msgContainers.length; i++) {
      var container = msgContainers[i];
      if (!container.closest('#main') && !container.closest('[data-testid="conversation-panel-body"]')) {
          continue;
      }

      if (!isSelfChatSync()) {
        var header = document.querySelector('header[data-sn-is-self="true"], [role="banner"][data-sn-is-self="true"]');
        if (!header) {
           continue;
        }
      }

      var innerDataElem = container.querySelector('div[data-id]') || container;
      var dataId = innerDataElem.getAttribute('data-id');
      
      // In a self-chat, ANY native message (incoming or outgoing) is from the user.
      // We process all of them as valid notes.
      var isNativeMessage = (dataId && (dataId.indexOf('true_') === 0 || dataId.indexOf('false_') === 0)) || 
                             container.hasAttribute('role') || 
                             container.classList.contains('message-out') || 
                             container.classList.contains('message-in');
                             
      if (!isNativeMessage) continue;

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
      console.log('🤖 [SaveNote] Intercepted message:', text);

      var isSelf = isSelfChatSync();
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
                          injectBotReply(`${CATEGORY_EMOJI[cat]} Got it! Saved under <strong>${cat}</strong>:<br><i>"${t}"</i> [category-pill]${cat}[/category-pill]`);
                      }, 1500);
                  }, 200);
              })(text);
          }
      } else {
          console.log('🤖 [SaveNote] Skipping (not a self-chat). Click bookmark again to force activate.');
      }
    }
  }

  // ===== Self-Chat Sync Check =====
  function isSelfChatSync() {
    var main = document.querySelector('#main') || 
               document.querySelector('[data-testid="conversation-panel-body"]') || 
               document.querySelector('div[role="main"]');
    
    if (!main) {
        var allHeaders = document.querySelectorAll('header, [data-testid="conversation-header"], [role="banner"]');
        for (var h = 0; h < allHeaders.length; h++) {
            if (isHeaderSelfChat(allHeaders[h])) return true;
        }
        return false;
    }

    var header = main.querySelector('header') || 
                 main.querySelector('[data-testid="conversation-header"]') || 
                 main.querySelector('[role="banner"]') ||
                 document.querySelector('header');
    
    if (!header) {
        var possibleTitles = main.querySelectorAll('[data-testid="conversation-info-header-chat-title"], span[title], [data-testid="contact-name"]');
        for (var t = 0; t < possibleTitles.length; t++) {
            var txt = possibleTitles[t].textContent || possibleTitles[t].getAttribute('title') || '';
            var clean = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
            if (txt.indexOf(BOT_NAME) !== -1 || isSelfChatTitle(clean)) return true;
        }
        var input = main.querySelector('footer div[contenteditable="true"]');
        if (input) {
            var placeholder = (input.getAttribute('aria-label') || input.textContent || '').toLowerCase();
            if (isSelfChatTitle(placeholder)) return true;
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
        if (title.indexOf(BOT_NAME) !== -1 || isSelfChatTitle(clean)) return true;
    }

    var children = header.querySelectorAll('span, div[title], div[role="button"]');
    for (var i = 0; i < children.length; i++) {
        var text = (children[i].textContent || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        var attr = (children[i].getAttribute('title') || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
        if (isSelfChatTitle(text) || isSelfChatTitle(attr) || text.indexOf(BOT_NAME.toLowerCase()) !== -1) return true;
    }

    var fullText = header.textContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
    if (isSelfChatTitle(fullText) || fullText.indexOf(BOT_NAME.toLowerCase()) !== -1) return true;

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
  
  console.log(`🤖 ${BOT_NAME} Initialized.`);
  showInstructions();
})();
