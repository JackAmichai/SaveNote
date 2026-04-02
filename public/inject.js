/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Fixed Interaction & Storage Fallback
 */

(function () {
  'use strict';

  // Toggle if already loaded
  if (window.__savenote_loaded) {
    if (window.__sn_toggle) window.__sn_toggle();
    return;
  }
  window.__savenote_loaded = true;

  // ===== Configuration =====
  var BOT_NAME = 'SaveNote AI';
  var BOT_COLOR = '#008069';
  var BOT_SVG = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;

  // ===== Storage Fallback =====
  var _memoryNotes = [];
  function loadNotes() {
    try {
      var data = localStorage.getItem('savenote_data');
      return data ? JSON.parse(data) : _memoryNotes;
    } catch (e) {
      console.warn('🤖 [SaveNote] Storage denied, using memory.', e);
      return _memoryNotes;
    }
  }
  function saveNotes(n) {
    try {
      localStorage.setItem('savenote_data', JSON.stringify(n));
    } catch (e) {
      _memoryNotes = n;
    }
  }

  // ===== UI State =====
  var isPanelOpen = false;
  var ui = { panel: null, messageList: null, input: null };

  // ===== Logic =====
  function categorize(t) {
    var kws = {
        parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|חנית|חניתי|חניה|רכב|קומה)\b/i,
        book: /\b(book|read|reading|author|novel|chapter|finished|started|ספר|קראתי|קריאה|לקריאה|סופר)\b/i,
        idea: /\b(idea|thought|maybe|what if|concept|brainstorm|should try|רעיון|אולי|מה אם)\b/i
    };
    for(var k in kws) if(kws[k].test(t)) return k;
    return 'other';
  }

  // ===== UI Components =====

  function createSidebarButton() {
    if (document.getElementById('sn-sidebar-btn')) return;

    // Multiple selector strategy for the sidebar header
    var header = document.querySelector('header[data-testid="chat-list-header"]') || 
                 document.querySelector('#side header') ||
                 document.querySelector('div[data-testid="side"] header');
    
    if (!header) return;

    var btn = document.createElement('div');
    btn.id = 'sn-sidebar-btn';
    btn.setAttribute('style', 'cursor:pointer !important; width:40px !important; height:40px !important; display:flex !important; align-items:center !important; justify-content:center !important; border-radius:50% !important; margin: 0 2px !important; transition: background 0.2s !important; z-index: 1000 !important; pointer-events: all !important;');
    btn.innerHTML = BOT_SVG;
    btn.title = 'Open SaveNote AI';
    
    btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        togglePanel();
    }, true);

    // Find the icon container (usually next to 'New Chat' or 'Status')
    var container = header.querySelector('div[role="button"]')?.parentElement || header;
    if (container !== header) {
        container.insertBefore(btn, container.firstChild);
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
    panel.setAttribute('style', `position:fixed !important; top:0 !important; right:0 !important; width:100% !important; max-width:calc(100% - 410px) !important; height:100% !important; z-index:10000 !important; display:none; flex-direction:column !important; background:${bgColor} !important; box-shadow: -2px 0 12px rgba(0,0,0,0.2) !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; pointer-events: all !important;`);
    
    // Header
    var h = document.createElement('div');
    h.setAttribute('style', `background:${headerColor} !important; padding:10px 16px !important; display:flex !important; align-items:center !important; height:60px !important; box-sizing:border-box !important; border-bottom:1px solid rgba(0,0,0,0.05) !important;`);
    h.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:15px;background:white;display:flex;align-items:center;justify-content:center;">${BOT_SVG}</div>
        <div style="flex:1;">
            <div style="font-weight:500;color:${textColor};font-size:16px;">${BOT_NAME}</div>
            <div id="sn-status" style="font-size:13px;color:#667781;">online</div>
        </div>
        <div id="sn-close" style="cursor:pointer;font-size:24px;color:#667781;padding:5px 10px;">✕</div>
    `;
    h.querySelector('#sn-close').onclick = togglePanel;

    // Message List
    var list = document.createElement('div');
    list.setAttribute('style', 'flex:1;overflow-y:auto;padding:20px 10%;display:flex;flex-direction:column;');
    
    // Footer
    var f = document.createElement('div');
    f.setAttribute('style', `background:${headerColor} !important; padding:10px 16px !important; display:flex !important; align-items:center !important; min-height:62px !important;`);
    
    var input = document.createElement('div');
    input.id = 'sn-input';
    input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Type a note...');
    input.setAttribute('style', `flex:1 !important; background:${isDark ? '#2a3942' : '#ffffff'} !important; color:${textColor} !important; padding:10px 14px !important; border-radius:8px !important; font-size:15px !important; min-height:20px !important; max-height:120px !important; overflow-y:auto !important; outline:none !important; cursor:text !important; pointer-events:all !important;`);
    
    input.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            var text = this.textContent.trim();
            if (text) {
                this.textContent = '';
                processNote(text);
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

    // Global CSS for placeholder
    var s = document.createElement('style');
    s.innerHTML = '#sn-input:empty:before { content: attr(placeholder); color: #667781; }';
    document.head.appendChild(s);
  }

  function togglePanel() {
    if (!ui.panel) createPanel();
    isPanelOpen = !isPanelOpen;
    ui.panel.style.display = isPanelOpen ? 'flex' : 'none';
    if (isPanelOpen) {
        ui.input.focus();
        if (ui.messageList.children.length === 0) renderHistoricNotes();
    }
  }
  window.__sn_toggle = togglePanel;

  function renderHistoricNotes() {
    ui.messageList.innerHTML = '';
    appendMessage('bot', `👋 <strong>Hi! I'm your SaveNote Assistant.</strong><br>I work even if storage is restricted! Type anything below.`);
    var notes = loadNotes();
    notes.slice(0, 10).reverse().forEach(function(n) {
        appendMessage('user', n.raw_message);
        appendMessage('bot', `Saved in <strong>${n.category}</strong>`);
    });
  }

  function processNote(text) {
    appendMessage('user', text);
    var status = document.getElementById('sn-status');
    if (status) status.textContent = 'typing...';
    
    setTimeout(function() {
        var cat = categorize(text);
        var notesArr = loadNotes();
        notesArr.unshift({ category: cat, raw_message: text, created_at: new Date().toISOString() });
        saveNotes(notesArr);
        if (status) status.textContent = 'online';
        appendMessage('bot', `Got it! Saved as <strong>${cat}</strong>.`);
    }, 800);
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
    
    bubble.setAttribute('style', `background:${bg}; color:${color}; padding:8px 14px; border-radius:12px; max-width:85%; font-size:14.5px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); word-break: break-word; line-height: 1.4; border-${isUser ? 'top-right' : 'top-left'}-radius: 0;`);
    bubble.innerHTML = content;
    
    row.appendChild(bubble);
    ui.messageList.appendChild(row);
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  }

  setInterval(createSidebarButton, 1500);
  console.log('🤖 [SaveNote] V3 Fixed Bookmarklet Initialized.');
  togglePanel(); // Open immediately on inject
})();
