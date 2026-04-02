/**
 * SaveNote — WhatsApp Web Content Script
 * New Injection Method: Assimilated UI Panel
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

  var BOT_NAME = 'SaveNote AI';
  var BOT_COLOR = '#008069';
  var BOT_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;
  var TAIL_SVG = `<svg viewBox="0 0 8 13" width="8" height="13" class=""><path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path><path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path></svg>`;

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

  var notes = [];

  // ===== State =====
  var isPanelOpen = false;

  // ===== UI Elements =====
  var ui = {
    sidebarButton: null,
    panel: null,
    messageList: null,
    input: null,
  };

  // ===== Storage & Logic =====
  async function loadNotes() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(['notes'], function(data) {
        notes = data.notes || [];
        resolve(notes);
      });
    });
  }

  function categorize(text) {
    for (var category in CATEGORY_KEYWORDS) {
      if (CATEGORY_KEYWORDS[category].test(text)) return category;
    }
    return 'other';
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
      }, function(response) {
        if (response && response.success) {
          notes.unshift(response.note);
          appendUserMessage(text);
          simulateTyping();
          setTimeout(function() {
            appendBotReply(`${CATEGORY_EMOJI[category]} Got it! Saved under <strong>${category}</strong>:<br><i>"${text}"</i>`);
            resolve(response.note);
          }, 1000);
        }
      });
    });
  }

  function handleCommand(text) {
    var lower = text.toLowerCase();
    
    if (lower.match(/\b(help|hi|hello)\b/)) {
        simulateTyping();
        setTimeout(function() {
            appendBotReply(`👋 <strong>Hi, I'm ${BOT_NAME}.</strong><br><br>I organize your thoughts using AI. Just message me anything you want to remember:<br><i>"I parked on level 3"</i><br><br>Later, you can just ask me:<br><i>"Where did I park?"</i>`);
        }, 1200);
        return true;
    }
    
    if (lower.match(/\b(what|which|show|list)\b.*?\b(book|read|reading)\b/)) {
      var books = notes.filter(function(n) { return n.category === 'book'; });
      simulateTyping();
      setTimeout(function() {
          if (books.length === 0) appendBotReply("📚 You haven't saved any books yet.");
          else appendBotReply(`📚 <strong>Your reading list:</strong><br><br>${books.slice(0, 5).map(function(b, i) { return (i+1) + '. ' + b.summary; }).join('<br>')}`);
      }, 1200);
      return true;
    }
    
    // ... additional commands can be added here
    return false;
  }

  // ===== UI: Assimilated Panel =====

  function createSidebarButton() {
    var header = document.querySelector('header[data-testid="chat-list-header"]') || 
                 document.querySelector('header') ||
                 document.querySelector('#side header');
    
    if (!header || document.getElementById('sn-sidebar-btn')) return;

    var btnContainer = document.createElement('div');
    btnContainer.id = 'sn-sidebar-btn';
    btnContainer.title = 'Open SaveNote AI';
    btnContainer.setAttribute('style', 'cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;margin-left:8px;border-radius:50%;transition:background 0.2s;');
    btnContainer.onmouseover = function() { this.style.background = 'rgba(0,0,0,0.05)'; };
    btnContainer.onmouseout = function() { this.style.background = 'transparent'; };
    
    var icon = document.createElement('div');
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.innerHTML = BOT_SVG;
    
    btnContainer.appendChild(icon);
    btnContainer.onclick = togglePanel;

    // Find a place to insert: usually next to Status or New Chat icon
    var iconsRow = header.querySelector('div[role="button"]')?.parentElement;
    if (iconsRow) {
        iconsRow.insertBefore(btnContainer, iconsRow.firstChild);
    } else {
        header.appendChild(btnContainer);
    }
    ui.sidebarButton = btnContainer;
  }

  function createPanel() {
    if (ui.panel) return;

    var isDark = document.body.classList.contains('dark') || document.body.getAttribute('data-theme') === 'dark';
    var bgColor = isDark ? '#0b141a' : '#efeae2';
    var headerColor = isDark ? '#202c33' : '#f0f2f5';
    var textColor = isDark ? '#e9edef' : '#111b21';

    var panel = document.createElement('div');
    panel.id = 'sn-chat-panel';
    panel.setAttribute('style', `position:absolute;top:0;right:0;width:100%;height:100%;z-index:1000;display:none;flex-direction:column;background:${bgColor};animation:sn-slide-in 0.3s ease-out;`);
    
    // Header
    var header = document.createElement('div');
    header.setAttribute('style', `background:${headerColor};padding:10px 16px;display:flex;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);z-index:10;`);
    
    var avatar = document.createElement('div');
    avatar.setAttribute('style', 'width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:15px;');
    avatar.innerHTML = BOT_SVG;

    var titleInfo = document.createElement('div');
    titleInfo.style.flex = '1';
    titleInfo.innerHTML = `<div style="font-weight:500;color:${textColor};font-size:16px;">${BOT_NAME}</div><div id="sn-status" style="font-size:13px;color:#667781;">online</div>`;

    var closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('style', `cursor:pointer;font-size:20px;color:#667781;padding:5px 10px;`);
    closeBtn.onclick = togglePanel;

    header.appendChild(avatar);
    header.appendChild(titleInfo);
    header.appendChild(closeBtn);

    // Message List
    var list = document.createElement('div');
    list.id = 'sn-message-list';
    list.setAttribute('style', 'flex:1;overflow-y:auto;padding:20px 5%;display:flex;flex-direction:column;');
    
    // Footer
    var footer = document.createElement('div');
    footer.setAttribute('style', `background:${headerColor};padding:10px 16px;display:flex;align-items:center;`);
    
    var input = document.createElement('div');
    input.id = 'sn-input';
    input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Type a note...');
    input.setAttribute('style', `flex:1;background:${isDark ? '#2a3942' : '#ffffff'};color:${textColor};padding:9px 12px;border-radius:8px;font-size:15px;min-height:20px;max-height:100px;overflow-y:auto;outline:none;`);
    
    input.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            var text = this.textContent.trim();
            if (text) {
                this.textContent = '';
                if (!handleCommand(text)) { saveNote(text); }
            }
        }
    };

    footer.appendChild(input);

    panel.appendChild(header);
    panel.appendChild(list);
    panel.appendChild(footer);

    // Append to the main content area (right side)
    var main = document.getElementById('main') || document.querySelector('[data-testid="conversation-panel-body"]')?.parentElement;
    if (main) {
        main.style.position = 'relative';
        main.appendChild(panel);
    } else {
        document.body.appendChild(panel);
    }

    ui.panel = panel;
    ui.messageList = list;
    ui.input = input;

    // Inject CSS for animation
    var style = document.createElement('style');
    style.innerHTML = `
        @keyframes sn-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        #sn-input:empty:before { content: attr(placeholder); color: #667781; }
    `;
    document.head.appendChild(style);
  }

  function togglePanel() {
    if (!ui.panel) createPanel();
    isPanelOpen = !isPanelOpen;
    ui.panel.style.display = isPanelOpen ? 'flex' : 'none';
    if (isPanelOpen) {
        ui.input.focus();
        if (ui.messageList.children.length === 0) {
            renderHistoricNotes();
        }
    }
  }

  function renderHistoricNotes() {
    ui.messageList.innerHTML = '';
    // Welcome message
    appendBotReply(`👋 <strong>Hi! I'm your SaveNote Assistant.</strong><br>I've replaced the old injection method with this clean panel.<br><br>Type anything here to save it as a note!`);
    
    // Show last 5 notes
    notes.slice(0, 5).reverse().forEach(function(n) {
        appendUserMessage(n.raw_message, true);
        appendBotReply(`${CATEGORY_EMOJI[n.category]} Saved in <strong>${n.category}</strong>`, true);
    });
  }

  function appendUserMessage(text, isHistoric) {
    var isDark = document.body.classList.contains('dark') || document.body.getAttribute('data-theme') === 'dark';
    var bubbleBg = isDark ? '#005c4b' : '#d9fdd3';
    var textColor = isDark ? '#e9edef' : '#111b21';

    var row = document.createElement('div');
    row.style = 'display:flex;justify-content:flex-end;margin-bottom:8px;';
    
    var bubble = document.createElement('div');
    bubble.setAttribute('style', `background:${bubbleBg};color:${textColor};padding:6px 10px;border-radius:8px 0 8px 8px;max-width:85%;font-size:14.2px;box-shadow:0 1px 0.5px rgba(0,0,0,0.13);position:relative;`);
    bubble.textContent = text;
    
    row.appendChild(bubble);
    ui.messageList.appendChild(row);
    scrollToBottom();
  }

  function appendBotReply(html, isHistoric) {
    var isDark = document.body.classList.contains('dark') || document.body.getAttribute('data-theme') === 'dark';
    var bubbleBg = isDark ? '#202c33' : '#ffffff';
    var textColor = isDark ? '#e9edef' : '#111b21';

    var row = document.createElement('div');
    row.style = 'display:flex;justify-content:flex-start;margin-bottom:8px;';
    
    var bubble = document.createElement('div');
    bubble.setAttribute('style', `background:${bubbleBg};color:${textColor};padding:6px 10px;border-radius:0 8px 8px 8px;max-width:85%;font-size:14.2px;box-shadow:0 1px 0.5px rgba(0,0,0,0.13);position:relative;`);
    bubble.innerHTML = html;
    
    row.appendChild(bubble);
    ui.messageList.appendChild(row);
    scrollToBottom();
  }

  function simulateTyping() {
    var status = document.getElementById('sn-status');
    if (status) {
        status.textContent = 'typing...';
        status.style.color = '#00a884';
        setTimeout(function() {
            status.textContent = 'online';
            status.style.color = '#667781';
        }, 1200);
    }
  }

  function scrollToBottom() {
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  }

  // ===== Observers =====
  function startObservers() {
    setInterval(createSidebarButton, 2000);
  }

  function init() {
    loadNotes().then(function() {
        startObservers();
        console.log('🤖 [SaveNote] UI Initialized.');
    });
  }

  if (document.readyState === 'complete') { setTimeout(init, 2000); }
  else { window.addEventListener('load', function() { setTimeout(init, 2000); }); }
})();
