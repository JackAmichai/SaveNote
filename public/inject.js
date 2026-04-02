/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * Final Version: Search/Recall Logic + Command Support
 */

(function () {
  'use strict';

  // Toggle if already loaded
  if (window.__savenote_loaded_v4) {
    if (window.__sn_toggle) window.__sn_toggle();
    return;
  }
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

  // ===== Storage Fallback =====
  var _memoryNotes = [];
  function loadNotes() {
    try {
      var data = localStorage.getItem('savenote_data');
      return data ? JSON.parse(data) : _memoryNotes;
    } catch (e) {
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

  // ===== Search & Logic =====
  function categorize(t) {
    var kws = {
        parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|חנית|חניתי|חניה|רכב|קומה)\b/i,
        book: /\b(book|read|reading|author|novel|chapter|finished|started|ספר|קראתי|קריאה|לקריאה|סופר)\b/i,
        idea: /\b(idea|thought|maybe|what if|concept|brainstorm|should try|רעיון|אולי|מה אם)\b/i,
        reminder: /\b(remind|remember|don't forget|todo|task|buy|call|schedule|תזכורת|לזכור|לקנות|פגישה)\b/i,
        shopping: /\b(shop|shopping|buy|groceries|supermarket|market|shoes|clothes|קניות|סופר|לקנות)\b/i
    };
    for(var k in kws) if(kws[k].test(t)) return k;
    return 'other';
  }

  function searchNotes(query) {
    var notes = loadNotes();
    var lower = query.toLowerCase();
    var category = categorize(lower);
    return notes.filter(function(n) {
      return n.category === category || n.raw_message.toLowerCase().includes(lower.replace(/\b(where|what|is|my|show|me)\b/gi, '').trim());
    });
  }

  // ===== UI State =====
  var isPanelOpen = false;
  var ui = { panel: null, messageList: null, input: null };

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

    var target = header.querySelector('[data-testid="status-v3"]') || 
                 header.querySelector('div[role="button"]')?.parentElement || 
                 header;
    if (target !== header) target.parentElement.insertBefore(btn, target);
    else header.appendChild(btn);
  }

  function createPanel() {
    if (ui.panel) return;

    var isDark = document.body.classList.contains('dark') || document.body.getAttribute('data-theme') === 'dark';
    var bgColor = isDark ? '#0b141a' : '#efeae2';
    var headerColor = isDark ? '#202c33' : '#f0f2f5';
    var textColor = isDark ? '#e9edef' : '#111b21';

    var panel = document.createElement('div');
    panel.id = 'sn-chat-panel';
    panel.setAttribute('style', `position:fixed !important; top:0 !important; right:0 !important; width:100% !important; max-width:calc(100% - 410px) !important; height:100% !important; z-index:10000 !important; display:none; flex-direction:column !important; background:${bgColor} !important; box-shadow: -4px 0 15px rgba(0,0,0,0.15) !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; pointer-events: all !important;`);
    
    if (window.innerWidth < 900) panel.style.width = '100%';

    var h = document.createElement('div');
    h.setAttribute('style', `background:${headerColor} !important; padding:10px 16px !important; display:flex !important; align-items:center !important; height:60px !important; box-sizing:border-box !important; border-bottom:1px solid rgba(0,0,0,0.08) !important;`);
    h.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:15px;background:white;display:flex;align-items:center;justify-content:center;">${BOT_SVG}</div>
        <div style="flex:1;">
            <div style="font-weight:600;color:${textColor};font-size:16px;">${BOT_NAME}</div>
            <div id="sn-status" style="font-size:13px;color:#00a884;">online</div>
        </div>
        <div id="sn-close" style="cursor:pointer;font-size:24px;color:#667781;padding:5px 10px;">✕</div>
    `;
    h.querySelector('#sn-close').onclick = togglePanel;

    var list = document.createElement('div');
    list.setAttribute('style', 'flex:1;overflow-y:auto;padding:20px 8%;display:flex;flex-direction:column;scroll-behavior:smooth;');
    
    var f = document.createElement('div');
    f.setAttribute('style', `background:${headerColor} !important; padding:12px 16px !important; display:flex !important; align-items:center !important; border-top:1px solid rgba(0,0,0,0.05) !important;`);
    
    var input = document.createElement('div');
    input.id = 'sn-input';
    input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Type "Post ..." to save or "Return ..." to search');
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
  window.__sn_toggle = togglePanel;

  function renderWelcome() {
    ui.messageList.innerHTML = '';
    appendMessage('bot', `👋 <strong>Welcome back!</strong><br><br>I'm your AI memory assistant. I use local storage to keep your notes private.<br><br>📝 <strong>Post</strong>: Save something specifically.<br>🔍 <strong>Return</strong>: Query your memories.<br><br><i>Ex: "Return my car parking"</i>`);
  }

  function processNote(text) {
    appendMessage('user', text);
    var status = document.getElementById('sn-status');
    if (status) status.textContent = 'thinking...';
    
    var lower = text.toLowerCase();
    
    setTimeout(function() {
        if (lower.startsWith('return ') || lower.startsWith('query ') || lower.includes('where') || lower.includes('what') || lower.includes('show')) {
            var results = searchNotes(lower.replace(/^(return|query)\s+/i, ''));
            if (results.length > 0) {
                var res = `🔍 <strong>Found ${results.length} notes:</strong><br><br>` + 
                          results.slice(0, 3).map(function(r) { return `${CATEGORY_EMOJI[r.category]} "${r.raw_message}"`; }).join('<br><br>');
                appendMessage('bot', res);
            } else {
                appendMessage('bot', `❌ Sorry, I couldn't find anything for that.`);
            }
        } else {
            var content = lower.startsWith('post ') ? text.substring(5) : text;
            var cat = categorize(content);
            var notesArr = loadNotes();
            notesArr.unshift({ category: cat, raw_message: content, created_at: new Date().toISOString() });
            saveNotes(notesArr);
            appendMessage('bot', `${CATEGORY_EMOJI[cat]} <strong>Saved!</strong> I've added this to your ${cat} list.`);
        }
        if (status) status.textContent = 'online';
    }, 1000);
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

  setInterval(createSidebarButton, 2000);
  console.log('🤖 [SaveNote] V4 Bookmarklet Ready.');
  togglePanel();
})();
