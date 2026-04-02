/**
 * SaveNote — WhatsApp Web Content Script
 * Final Version: Search/Recall Logic + Command Support
 */

(function () {
  'use strict';

  if (window.__savenote_loaded_v4) return;
  window.__savenote_loaded_v4 = true;

  // ===== Configuration =====
  var BOT_NAME = 'SaveNote AI';
  var BOT_COLOR = '#008069';
  var BOT_SVG = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;

  var CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📌',
  };

  var notes = [];
  var isPanelOpen = false;
  var ui = { sidebarButton: null, panel: null, messageList: null, input: null };

  // ===== Storage Logic =====
  async function loadNotes() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(['notes'], function(data) {
        notes = data.notes || [];
        resolve(notes);
      });
    });
  }

  function saveNoteToStorage(note) {
    notes.unshift(note);
    chrome.storage.local.set({ notes: notes });
  }

  // ===== Search & AI Logic =====
  function categorize(text) {
    var kws = {
      parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|חנית|חניתי|חניה|רכב|קומה)\b/i,
      book: /\b(book|read|reading|author|novel|chapter|finished|started|ספר|קראתי|קריאה|לקריאה|סופר)\b/i,
      idea: /\b(idea|thought|maybe|what if|concept|brainstorm|should try|רעיון|אולי|מה אם)\b/i,
      reminder: /\b(remind|remember|don't forget|todo|task|buy|call|schedule|תזכורת|לזכור|לקנות|פגישה)\b/i,
      shopping: /\b(shop|shopping|buy|groceries|supermarket|market|shoes|clothes|קניות|סופר|לקנות)\b/i,
    };
    for (var k in kws) if (kws[k].test(text)) return k;
    return 'other';
  }

  function searchNotes(query) {
    var lower = query.toLowerCase();
    // Look for category or keyword matches
    var category = categorize(lower);
    
    return notes.filter(function(n) {
      return n.category === category || n.raw_message.toLowerCase().includes(lower.replace(/\b(where|what|is|my|show|me)\b/gi, '').trim());
    });
  }

  async function handleInput(text) {
    if (!text.trim()) return;
    appendMessage('user', text);
    simulateTyping();

    var lower = text.toLowerCase();
    
    // Command: Return / Query
    if (lower.startsWith('return ') || lower.startsWith('query ') || lower.includes('where') || lower.includes('what') || lower.includes('show')) {
      var query = lower.replace(/^(return|query)\s+/i, '');
      var results = searchNotes(query);
      
      setTimeout(function() {
        if (results.length > 0) {
          var resMsg = `🔍 <strong>Found ${results.length} results:</strong><br><br>` + 
                       results.slice(0, 3).map(function(r) { 
                         return `${CATEGORY_EMOJI[r.category]} "${r.raw_message}"`; 
                       }).join('<br><br>');
          appendMessage('bot', resMsg);
        } else {
          appendMessage('bot', `❌ I couldn't find anything about that. Try being more specific!`);
        }
      }, 1000);
      return;
    }

    // Command: Post / Save
    var contentToSave = lower.startsWith('post ') ? text.substring(5) : text;
    var cat = categorize(contentToSave);

    setTimeout(function() {
      var newNote = {
        id: Date.now(),
        category: cat,
        raw_message: contentToSave,
        created_at: new Date().toISOString()
      };
      saveNoteToStorage(newNote);
      appendMessage('bot', `${CATEGORY_EMOJI[cat]} <strong>Saved!</strong> I've added this to your <strong>${cat}</strong> list.<br><br>Ask me "where" or "what" anytime to recall it.`);
    }, 1000);
  }

  // ===== UI Components =====

  function createSidebarButton() {
    if (document.getElementById('sn-sidebar-btn')) return;

    var header = document.querySelector('header[data-testid="chat-list-header"]') || 
                 document.querySelector('#side header') ||
                 document.querySelector('div[data-testid="side"] header');
    
    if (!header) return;

    var btn = document.createElement('div');
    btn.id = 'sn-sidebar-btn';
    btn.setAttribute('style', 'cursor:pointer !important; width:40px !important; height:40px !important; display:flex !important; align-items:center !important; justify-content:center !important; border-radius:50% !important; margin: 0 4px !important; transition: background 0.2s !important; z-index: 2000 !important; pointer-events: all !important;');
    btn.innerHTML = BOT_SVG;
    btn.title = 'Open SaveNote AI';
    
    btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        togglePanel();
    }, true);

    var container = header.querySelector('[data-testid="status-v3"]') || 
                    header.querySelector('div[role="button"]')?.parentElement || 
                    header;
    
    if (container !== header) {
        container.parentElement.insertBefore(btn, container);
    } else {
        header.appendChild(btn);
    }
  }

  function createPanel() {
    if (ui.panel) return;

    var isDark = document.body.classList.contains('dark') || document.body.getAttribute('data-theme') === 'dark';
    var bgColor = isDark ? '#0b141a' : '#efeae2';
    var headerColor = isDark ? '#202c33' : '#f0f2f5';
    var textColor = isDark ? '#e9edef' : '#111b21';

    var panel = document.createElement('div');
    panel.id = 'sn-chat-panel';
    panel.setAttribute('style', `position:fixed !important; top:0 !important; right:0 !important; width:calc(100% - 410px) !important; height:100% !important; z-index:10000 !important; display:none; flex-direction:column !important; background:${bgColor} !important; box-shadow: -4px 0 15px rgba(0,0,0,0.15) !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;`);
    
    if (window.innerWidth < 900) panel.style.width = '100%';

    var h = document.createElement('div');
    h.setAttribute('style', `background:${headerColor} !important; padding:10px 16px !important; display:flex !important; align-items:center !important; height:60px !important; border-bottom:1px solid rgba(0,0,0,0.08) !important; box-sizing:border-box !important;`);
    h.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:15px;background:white;display:flex;align-items:center;justify-content:center;">${BOT_SVG}</div>
        <div style="flex:1;">
            <div style="font-weight:600;color:${textColor};font-size:16px;">${BOT_NAME}</div>
            <div id="sn-status" style="font-size:13px;color:#00a884;">online</div>
        </div>
        <div id="sn-close" style="cursor:pointer;font-size:24px;color:#667781;padding:5px 10px;line-height:1;">✕</div>
    `;
    h.querySelector('#sn-close').onclick = togglePanel;

    var list = document.createElement('div');
    list.id = 'sn-message-list';
    list.setAttribute('style', 'flex:1 !important; overflow-y:auto !important; padding:20px 8% !important; display:flex !important; flex-direction:column !important; scroll-behavior: smooth !important;');
    
    var f = document.createElement('div');
    f.setAttribute('style', `background:${headerColor} !important; padding:12px 16px !important; display:flex !important; align-items:center !important; border-top:1px solid rgba(0,0,0,0.05) !important;`);
    
    var input = document.createElement('div');
    input.id = 'sn-input';
    input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Type "Post ..." to save or "Return ..." to search');
    input.setAttribute('style', `flex:1 !important; background:${isDark ? '#2a3942' : '#ffffff'} !important; color:${textColor} !important; padding:10px 14px !important; border-radius:8px !important; font-size:15px !important; min-height:20px !important; max-height:120px !important; overflow-y:auto !important; outline:none !important; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05) !important;`);
    
    input.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            var text = this.textContent.trim();
            if (text) {
                this.textContent = '';
                handleInput(text);
            }
        }
    };

    f.appendChild(input);
    panel.appendChild(h);
    panel.appendChild(list);
    panel.appendChild(f);

    document.body.appendChild(panel);
    ui.panel = panel;
    ui.messageList = list;
    ui.input = input;

    var s = document.createElement('style');
    s.innerHTML = '#sn-input:empty:before { content: attr(placeholder); color: #8696a0; }';
    document.head.appendChild(s);
  }

  function togglePanel() {
    if (!ui.panel) createPanel();
    isPanelOpen = !isPanelOpen;
    ui.panel.style.display = isPanelOpen ? 'flex' : 'none';
    if (isPanelOpen) {
        ui.input.focus();
        if (ui.messageList.children.length === 0) renderWelcome();
    }
  }

  function renderWelcome() {
    ui.messageList.innerHTML = '';
    appendMessage('bot', `👋 <strong>Hi, I'm ${BOT_NAME}.</strong><br><br>I organize your life using local storage. Just type to save a note, or use commands:<br><br>📝 <strong>Post</strong>: Save a note specifically.<br>🔍 <strong>Return</strong>: Find a saved note.<br><br><i>Ex: "Return where did I park?"</i>`);
  }

  function appendMessage(type, content) {
    if (!ui.messageList) return;
    var isDark = document.body.classList.contains('dark') || document.body.getAttribute('data-theme') === 'dark';
    var row = document.createElement('div');
    row.style = `display:flex; justify-content:${type === 'user' ? 'flex-end' : 'flex-start'}; margin-bottom:12px; width:100%;`;
    
    var bubble = document.createElement('div');
    var isUser = type === 'user';
    var bg = isUser ? (isDark ? '#005c4b' : '#d9fdd3') : (isDark ? '#202c33' : '#ffffff');
    var color = isDark ? '#e9edef' : '#111b21';
    
    bubble.setAttribute('style', `background:${bg}; color:${color}; padding:8px 14px; border-radius:12px; max-width:85%; font-size:14.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); word-break: break-word; line-height: 1.5; border-${isUser ? 'top-right' : 'top-left'}-radius: 0;`);
    bubble.innerHTML = content;
    
    row.appendChild(bubble);
    ui.messageList.appendChild(row);
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  }

  function simulateTyping() {
    var status = document.getElementById('sn-status');
    if (status) {
        status.textContent = 'thinking...';
        status.style.color = '#00a884';
        setTimeout(function() {
            status.textContent = 'online';
        }, 1000);
    }
  }

  // ===== Initialize =====
  function init() {
    loadNotes().then(function() {
        setInterval(createSidebarButton, 2000);
        console.log('🤖 [SaveNote] V4 Ready.');
    });
  }

  if (document.readyState === 'complete') { setTimeout(init, 2000); }
  else { window.addEventListener('load', function() { setTimeout(init, 2000); }); }
})();
