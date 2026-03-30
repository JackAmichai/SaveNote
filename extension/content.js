/**
 * SaveNote - WhatsApp Web Content Script
 * Pixel-Perfect Native Bot Mode - FIXED
 */

(function () {
  'use strict';

  // ====== Configuration ======
  var CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📝'
  };

  var CATEGORY_KEYWORDS = {
    parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|\u05D7\u05E0\u05D9\u05D9\u05D4|\u05D7\u05E0\u05D9|\u05D7\u05E0\u05D9\u05D5\u05EA|\u05D0\u05D5\u05D8\u05D5|\u05E8\u05DB\u05D1|\u05D0\u05D5\u05D8\u05D5\u05D1\u05D5\u05E1|\u05D0\u05D5\u05D8\u05D5\u05DE\u05D5\u05D1\u05D9\u05DC)\b/i,
    book: /\b(book|read|reading|author|novel|chapter|finished reading|started reading|page|\u05E1\u05E4\u05E8|\u05E7\u05E8\u05D0\u05D5|\u05E7\u05E8\u05D0\u05D4|\u05E1\u05E4\u05E8\u05D9\u05DD|\u05E7\u05E8\u05D0\u05EA\u05D9|\u05E7\u05E8\u05D0\u05D4|\u05E1\u05E4\u05E8)\b/i,
    idea: /\b(idea|thought|maybe|what if|concept|brainstorm|could|should try|\u05E8\u05E2\u05D9\u05D5\u05DF|\u05D0\u05D9\u05D3\u05D9\u05D4|\u05DE\u05D0\u05D9)\b/i,
    reminder: /\b(remember|don't forget|must|important|task|todo|to-do|\u05D6\u05DB\u05D5\u05E8|\u05D6\u05DB\u05D5\u05E8|\u05D7\u05E9\u05D5\u05D1|\u05DE\u05E9\u05D9\u05DE\u05D4|\u05DE\u05E9\u05D9\u05DE\u05D4)\b/i,
    location: /\b(location|address|place|where|coordinates|lat|long|\u05DE\u05D9\u05E7\u05D5\u05DD|\u05D0\u05D3\u05E8\u05E1|\u05E0\u05D9\u05EA\u05D5\u05D1|\u05DE\u05E7\u05D5\u05DD|\u05DE\u05E7\u05D5\u05DD)\b/i,
    person: /\b(person|contact|name|phone|email|who|\u05D0\u05D3\u05DD|\u05E7\u05E9\u05E8|\u05E9\u05DD|\u05D8\u05DC\u05E4\u05D5\u05DF|\u05DE\u05D9\u05DC)\b/i,
    recipe: /\b(recipe|cook|cooking|meal|ingredient|dish|how to make|\u05DE\u05EA\u05DB\u05D5\u05DF|\u05DC\u05D1\u05E9\u05DC|\u05D0\u05D5\u05DB\u05DC|\u05DE\u05E9\u05D9\u05D4|\u05DE\u05E8\u05D9\u05DD|\u05DE\u05EA\u05DB\u05D5\u05DF)\b/i,
    health: /\b(health|doctor|medicine|symptom|appointment|pill|\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA|\u05E8\u05D5\u05E4\u05D0|\u05EA\u05E8\u05D5\u05E4\u05D4|\u05EA\u05E1\u05DE\u05D9\u05DF|\u05D8\u05E8\u05D9\u05DE\u05D9\u05DF|\u05D1\u05D3\u05D9\u05E7\u05D4)\b/i,
    finance: /\b(buy|purchase|price|cost|money|bill|expense|payment|\u05E7\u05E0\u05D9\u05D9\u05D4|\u05E7\u05E0\u05D5\u05EA|\u05DE\u05D7\u05D9\u05E8|\u05DB\u05E1\u05E4\u05D9\u05DD|\u05EA\u05E9\u05DC\u05D5\u05DD|\u05E4\u05E8\u05D9\u05E2)\b/i,
    shopping: /\b(buy|shopping|groceries|list|need|get|\u05E7\u05E0\u05D9\u05D9\u05D4|\u05E7\u05E0\u05D5\u05EA|\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD|\u05E8\u05E9\u05D9\u05DE\u05D4|\u05E6\u05E8\u05D9\u05DA|\u05DC\u05E7\u05E0\u05D5\u05EA)\b/i
  };

  var BOT_NAME = 'SaveNote AI';
  var BOT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#00a884" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path fill="#00a884" d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"/><circle cx="12" cy="12" r="1.5" fill="#00a884"/></svg>';
  var TAIL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="10" height="15"><path fill="#00a884" d="M0 0h10l-10 15z"/></svg>';

  var BOT_DARK_COLOR = '#00a884';
  var BOT_LIGHT_COLOR = '#25D366';

  var notes = [];
  var typedCount = 0;
  var lastMsgContainer = null;
  var oldHTML = '';

 
  // ====== Storage Functions ======
  function loadNotes() {
    var stored = localStorage.getItem('savenote_notes');
    if (stored) {
      try {
        notes = JSON.parse(stored);
      } catch (e) {
        notes = [];
      }
    }
  }

  function saveNote(text) {
    var cat = detectCategory(text);
    var note = {
      text: text,
      category: cat,
      timestamp: Date.now(),
      summary: text.length > 100 ? text.substring(0, 100) + '...' : text
    };
    notes.unshift(note);
    if (notes.length > 500) notes.pop();
    localStorage.setItem('savenote_notes', JSON.stringify(notes));
  }

  function detectCategory(text) {
    var lower = text.toLowerCase();
    for (var key in CATEGORY_KEYWORDS) {
      if (CATEGORY_KEYWORDS[key].test(lower)) {
        return key;
      }
    }
    return 'other';
  }

 
  // ====== Hijack Identity (Bot Mode) ======
  function hijackIdentity() {
    var headerTitle = document.querySelector('header span[title], [data-testid="conversation-info-header-chat-title"]');
    if (headerTitle) {
      var txt = headerTitle.textContent || headerTitle.getAttribute('title') || '';
      var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var isSelfChat = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.includes('chat with yourself');
      if (isSelfChat) {
        if (headerTitle.textContent !== BOT_NAME && headerTitle.getAttribute('title') !== BOT_NAME) {
          headerTitle.textContent = BOT_NAME;
        }
        var header = headerTitle.closest('header');
        if (header && !header.dataset.snHijacked) {
          var avatarContainer = header.querySelector('[data-testid="avatar-img-container"]');
          if (avatarContainer) {
            avatarContainer.innerHTML = BOT_SVG;
            header.dataset.snHijacked = 'true';
          }
        }
      }
    }
  }

 
  // ====== Simulate Typing ======
  function simulateTyping() {
    typedCount = 0;
    lastMsgContainer = null;
    oldHTML = '';

    var chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || document.querySelector('[data-testid="conversation-panel-body"] > div');
    if (!chatPane) return;

    var typingIndicator = document.createElement('div');
    typingIndicator.className = 'sn-typing-indicator';
    typingIndicator.style.cssText = 'display:flex;align-items:center;padding:0 16px 12px;font-size:12px;color:var(--color-secondary);';
    typingIndicator.innerHTML = '<span>' + BOT_NAME + ' is typing</span>';

    chatPane.appendChild(typingIndicator);

    var scrollable = chatPane.querySelector('[role="list"]') || chatPane;
    scrollable.scrollTop = scrollable.scrollHeight;

    var typeInterval = setInterval(function() {
      typedCount++;
      if (typedCount >= 3) {
        clearInterval(typeInterval);
        if (typingIndicator.parentNode) {
          typingIndicator.parentNode.removeChild(typingIndicator);
        }
        if (lastMsgContainer) {
          lastMsgContainer.style.background = '';
          lastMsgContainer.style.animation = '';
        }
      } else if (lastMsgContainer) {
        lastMsgContainer.style.background = 'var(--background-light-shade)';
        lastMsgContainer.style.transition = 'background 0.2s';
        lastMsgContainer.style.animation = 'pulse 0.4s ease';
      }
    }, 300);
  }

 
  // ====== Inject Bot Reply (Native WhatsApp Style) ======
  function injectBotReply(html) {
    var chatPane = document.querySelector('[data-testid="conversation-panel-body"]');
    if (!chatPane) {
      console.log('SaveNote: Could not find chat pane');
      return;
    }

    var row = document.createElement('div');
    row.className = 'sn-bot-msg-row';
    var nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    row.innerHTML = '<div class="sn-bot-bubble-wrapper"><span class="sn-bot-tail">' + TAIL_SVG + '</span><div class="sn-bot-bubble"><div class="sn-bot-content">' + html + '</div><span class="sn-bot-time">' + nowStr + '</span></div></div>';
    row.style.cssText = 'display:flex;flex-direction:column;padding:2px 20px;margin-bottom:4px;align-self:flex-start;max-width:65%;';

    var list = chatPane.querySelector('[role="list"]') || chatPane;
    list.appendChild(row);

    setTimeout(function() {
      var scrollable = chatPane.querySelector('[role="list"]') || chatPane;
      scrollable.scrollTop = scrollable.scrollHeight + 500;
    }, 100);

    lastMsgContainer = row;
  }

 
  // ====== Handle Commands ======
  function handleCommand(msg) {
    var lower = msg.toLowerCase();

    if (lower.includes('what') && (lower.includes('park') || lower.includes('car'))) {
      var parking = notes.filter(function(n) { return n.category === 'parking'; });
      simulateTyping();
      setTimeout(function() {
        if (parking.length === 0) {
          injectBotReply('No parking notes saved yet.');
        } else {
          var list = parking.map(function(p) { return '- ' + p.summary; }).join('<br>');
          injectBotReply('<strong>Your parking locations:</strong><br>' + list);
        }
      }, 1500);
      return true;
    }

    if (lower.includes('what') && (lower.includes('shop') || lower.includes('groceries'))) {
      var shopping = notes.filter(function(n) { return n.category === 'shopping'; });
      simulateTyping();
      setTimeout(function() {
        if (shopping.length === 0) {
          injectBotReply('Your shopping list is empty.');
        } else {
          var list = shopping.map(function(s) { return '- ' + s.summary; }).join('<br>');
          injectBotReply('<strong>Your shopping list:</strong><br>' + list);
        }
      }, 1500);
      return true;
    }

    if (lower.includes('help') || lower.includes('hello') || lower.includes('hi ')) {
      simulateTyping();
      setTimeout(function() {
        injectBotReply('<strong>Hi! I am ' + BOT_NAME + '.</strong><br>Your personal memory assistant. Send me anything you want to remember.<br><br>Ask me: "what did I save about parking?" or "show my shopping list"');
      }, 1500);
      return true;
    }

    return false;
  }

 
  // ====== Start Observers ======
  function startObservers() {
    var chatPane = document.querySelector('[data-testid="conversation-panel-body"]');
    if (!chatPane) {
      setTimeout(startObservers, 500);
      return;
    }

    var list = chatPane.querySelector('[role="list"]') || chatPane;
    if (!list) {
      setTimeout(startObservers, 500);
      return;
    }

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          processNewElements(mutation.addedNodes);
        }
      });
    });

    observer.observe(list, { childList: true, subtree: true });
    console.log('SaveNote: Observer started');

    var navObserver = new MutationObserver(function() {
      setTimeout(checkSelfChat, 800);
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
  }

 
  // ====== Process New Message Elements ======
  function processNewElements(nodes) {
    nodes.forEach(function(node) {
      if (node.nodeType !== 1) return;
      var msg = node.querySelector('[data-testid="message-in"]:not([data-sn-processed]), [data-testid="message-out"]:not([data-sn-processed])');
      if (!msg) return;
      msg.dataset.snProcessed = 'true';

      var textElement = msg.querySelector('[data-testid="cell-frame"]:not([data-asset-intent="voice-message"]) span');
      if (textElement && textElement.textContent.trim()) {
        var text = textElement.textContent.trim();
        saveNote(text);
        console.log('SaveNote: Saved note:', text.substring(0, 50));
        if (handleCommand(text)) {
          return;
        }
        simulateTyping();
        setTimeout(function() {
          injectBotReply('<strong>Note saved!</strong> Saved to ' + detectCategory(text) + ' category.');
        }, 1500);
      }
    });
  }

  // ====== Check Self Chat ======
  function checkSelfChat() {
    var headerTitle = document.querySelector('header span[title], [data-testid="conversation-info-header-chat-title"]');
    if (headerTitle) {
      var txt = headerTitle.textContent || headerTitle.getAttribute('title') || '';
      var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
      var isSelfChat = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.includes('chat with yourself');
      if (isSelfChat) {
        hijackIdentity();
      }
    }
  }

  // ====== Init ======
  function init() {
    loadNotes();
    console.log('SaveNote: Initialized with ' + notes.length + ' notes');

    var style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%{opacity:0.5}50%{opacity:1}100%{opacity:0.5}}';
    document.head.appendChild(style);

    hijackIdentity();
    setTimeout(startObservers, 1000);
    setTimeout(checkSelfChat, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
