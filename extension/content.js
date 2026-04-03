/**
 * SaveNote — WhatsApp Web Content Script
 * V5: Advanced Categorization + File/Image Support
 */

(function () {
  'use strict';

  if (window.__savenote_loaded_v5) return;
  window.__savenote_loaded_v5 = true;

  // ===== Configuration =====
  var BOT_NAME = 'SaveNote AI';
  var BOT_COLOR = '#008069';
  var BOT_SVG = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="${BOT_COLOR}"/><path d="M12.013 5.013c4.105 0 7.435 3.328 7.435 7.435 0 4.104-3.33 7.434-7.435 7.434-1.306 0-2.538-.337-3.624-.93l-3.835 1.005 1.017-3.738a7.39 7.39 0 0 1-.993-3.705c0-4.107 3.33-7.435 7.435-7.435z" fill="white"/></svg>`;
  var CLIP_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M1.816 15.556v.043c0 .45.18.88.5 1.22 1.23 1.23 3.22 1.23 4.45 0l12.11-12.11c1.3-1.3 1.3-3.42 0-4.72-1.3-1.3-3.42-1.3-4.72 0L3.096 11.05c-1.56 1.56-1.56 4.09 0 5.65 1.56 1.56 4.09 1.56 5.65 0l11.03-11.03c.2-.2.51-.2.71 0s.2.51 0 .71L9.456 17.41c-1.95 1.95-5.12 1.95-7.07 0-1.95-1.95-1.95-5.12 0-7.07L13.446 1.28c1.69-1.69 4.44-1.69 6.13 0 1.69 1.69 1.69 4.44 0 6.13L7.466 19.52c-1.23 1.23-3.23 1.23-4.46 0-.32-.34-.5-.77-.5-1.22v-.04c0-.45.18-.88.5-1.22.2-.2.51-.2.71 0 .16.17.26.4.26.65s.1.48.26.65c.62.62 1.63.62 2.25 0l12.11-12.11c1.04-1.04 1.04-2.73 0-3.77-.5-.5-1.17-.78-1.88-.78s-1.38.28-1.88.78L4.026 13.88c-1.3 1.3-1.3 3.42 0 4.72 1.3 1.3 3.42 1.3 4.72 0l11.03-11.03c.2-.2.51-.2.71 0s.2.51 0 .71L9.456 19.31c-1.69 1.69-4.44 1.69-6.13 0-1.69-1.69-1.69-4.44 0-6.13l11.05-11.05c.2-.2.51-.2.71 0s.2.51 0 .71L4.036 13.89c-1.23 1.23-1.23 3.22 0 4.45.32.32.75.5 1.2.5s.88-.18 1.22-.5l12.11-12.11c1.04-1.04 2.73-1.04 3.77 0 1.04 1.04 1.04 2.73 0 3.77L9.456 22.14c-2.34 2.34-6.14 2.34-8.48 0-2.35-2.34-2.35-6.14-.01-8.49l11.05-11.05c.2-.2.51-.2.71 0s.2.51 0 .71L1.686 11.85c-.32.34-.5.77-.5 1.22v.043c0 .45.18.88.5 1.22.2.2.51.2.71 0 .32-.34.5-.77.5-1.22v-.043c0-.45-.18-.88-.5-1.22-.2-.2-.51-.2-.71 0z"/></svg>`;

  var CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📌',
  };

  var CATEGORY_KEYWORDS = {
    parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|חנית|חניתי|חניה|רכב|קומה)\b/i,
    book: /\b(book|read|reading|author|novel|chapter|finished|started|ספר|קראתי|קריאה|לקריאה|סופר)\b/i,
    idea: /\b(idea|thought|maybe|what if|concept|brainstorm|should try|רעיון|אולי|מה אם)\b/i,
    reminder: /\b(remind|remember|don't forget|todo|task|call|schedule|פגישה|תזכורת|לזכור)\b/i,
    shopping: /\b(shop|shopping|buy|groceries|supermarket|market|shoes|clothes|list|קניות|סופר|לקנות)\b/i,
    location: /\b(location|place|address|street|restaurant|cafe|bar|store|מקום|כתובת|מסעדה|רחוב)\b/i,
    person: /\b(met |person|name is|works at|contact|friend|colleague|פגשתי|חבר|עובד ב)\b/i,
    recipe: /\b(recipe|cook|ingredient|food|dish|meal|bake|fry|מתכון|בישול|אוכל)\b/i,
    health: /\b(health|doctor|medicine|medication|symptom|diagnosis|hospital|רופא|בריאות|תרופה)\b/i,
    finance: /\b(money|pay|paid|cost|price|expense|salary|bank|finance|budget|\$|₪|כסף|שילמתי|עלות|הוצאה)\b/i,
  };

  var notes = [];
  var isPanelOpen = false;
  var ui = { sidebarButton: null, panel: null, messageList: null, input: null, fileInput: null };

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
    for (var k in CATEGORY_KEYWORDS) if (CATEGORY_KEYWORDS[k].test(text)) return k;
    return 'other';
  }

  function searchNotes(query) {
    var lower = query.toLowerCase();
    var catMatch = categorize(lower);
    return notes.filter(function(n) {
      return (n.category === catMatch && catMatch !== 'other') || 
             n.raw_message.toLowerCase().includes(lower.replace(/\b(where|what|is|my|show|me|did|i)\b/gi, '').trim());
    });
  }

  async function handleInput(text, attachments) {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;
    
    // UI feedback for attachments
    var userMsgHtml = text;
    if (attachments && attachments.length > 0) {
      attachments.forEach(function(a) {
        if (a.type.startsWith('image/')) {
          userMsgHtml += `<br><img src="${a.data}" style="max-width:200px;border-radius:8px;margin-top:8px;">`;
        } else {
          userMsgHtml += `<br><div style="padding:8px;background:rgba(0,0,0,0.05);border-radius:4px;margin-top:8px;font-size:12px;">📄 ${a.name}</div>`;
        }
      });
    }

    appendMessage('user', userMsgHtml);
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
                         var msg = `${CATEGORY_EMOJI[r.category]} "${r.raw_message}"`;
                         if (r.attachments && r.attachments.length > 0) {
                           r.attachments.forEach(function(att) {
                             if (att.type.startsWith('image/')) msg += `<br><img src="${att.data}" style="max-width:180px;border-radius:4px;margin-top:4px;">`;
                             else msg += `<br>📄 ${att.name}`;
                           });
                         }
                         return msg;
                       }).join('<br><hr style="border:0;border-top:1px solid rgba(0,0,0,0.05);margin:10px 0;"><br>');
          appendMessage('bot', resMsg);
        } else {
          appendMessage('bot', `❌ I couldn't find anything matching that. Try different keywords!`);
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
        attachments: attachments || [],
        created_at: new Date().toISOString()
      };
      saveNoteToStorage(newNote);
      appendMessage('bot', `${CATEGORY_EMOJI[cat]} <strong>Saved to ${cat}!</strong><br><br>I've securely stored this note ${attachments?.length > 0 ? 'and its attachments ' : ''}in your local storage.`);
    }, 1000);
  }

  // ===== UI Components =====

  function createSidebarButton() {
    if (document.getElementById('sn-sidebar-btn')) return;
    var header = document.querySelector('header[data-testid="chat-list-header"]') || document.querySelector('#side header');
    if (!header) return;

    var btn = document.createElement('div');
    btn.id = 'sn-sidebar-btn';
    btn.setAttribute('style', 'cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin:0 4px;transition:background 0.2s;z-index:2000;');
    btn.innerHTML = BOT_SVG;
    btn.title = 'Open SaveNote AI';
    btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); togglePanel(); }, true);

    var container = header.querySelector('[data-testid="status-v3"]') || header.querySelector('div[role="button"]')?.parentElement || header;
    if (container !== header) container.parentElement.insertBefore(btn, container);
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
    panel.setAttribute('style', `position:fixed;top:0;right:0;width:calc(100% - 410px);height:100%;z-index:10000;display:none;flex-direction:column;background:${bgColor};box-shadow:-4px 0 15px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;`);
    if (window.innerWidth < 900) panel.style.width = '100%';

    var h = document.createElement('div');
    h.setAttribute('style', `background:${headerColor};padding:10px 16px;display:flex;align-items:center;height:60px;border-bottom:1px solid rgba(0,0,0,0.08);box-sizing:border-box;`);
    h.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:15px;background:white;display:flex;align-items:center;justify-content:center;">${BOT_SVG}</div><div style="flex:1;"><div style="font-weight:600;color:${textColor};font-size:16px;">${BOT_NAME}</div><div id="sn-status" style="font-size:13px;color:#00a884;">online</div></div><div id="sn-close" style="cursor:pointer;font-size:24px;color:#667781;padding:5px 10px;">✕</div>`;
    h.querySelector('#sn-close').onclick = togglePanel;

    var list = document.createElement('div');
    list.id = 'sn-message-list';
    list.setAttribute('style', 'flex:1;overflow-y:auto;padding:20px 8%;display:flex;flex-direction:column;scroll-behavior:smooth;');
    
    var f = document.createElement('div');
    f.setAttribute('style', `background:${headerColor};padding:12px 16px;display:flex;align-items:center;border-top:1px solid rgba(0,0,0,0.05);gap:12px;`);
    
    var clip = document.createElement('div');
    clip.innerHTML = CLIP_SVG;
    clip.setAttribute('style', 'cursor:pointer;color:#8696a0;display:flex;align-items:center;transition:color 0.2s;');
    clip.onclick = function() { ui.fileInput.click(); };
    clip.onmouseover = function() { this.style.color = '#00a884'; };
    clip.onmouseout = function() { this.style.color = '#8696a0'; };

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.multiple = true;
    fileInput.onchange = handleFileUpload;
    ui.fileInput = fileInput;

    var input = document.createElement('div');
    input.id = 'sn-input';
    input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Save a note or file...');
    input.setAttribute('style', `flex:1;background:${isDark ? '#2a3942' : '#ffffff'};color:${textColor};padding:10px 14px;border-radius:8px;font-size:15px;min-height:20px;max-height:120px;overflow-y:auto;outline:none;`);
    input.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var t = this.textContent.trim(); if (t) { this.textContent = ''; handleInput(t, []); } }
    };

    f.appendChild(clip);
    f.appendChild(fileInput);
    f.appendChild(input);
    panel.appendChild(h);
    panel.appendChild(list);
    panel.appendChild(f);
    document.body.appendChild(panel);
    ui.panel = panel; ui.messageList = list; ui.input = input;

    var s = document.createElement('style');
    s.innerHTML = '#sn-input:empty:before { content: attr(placeholder); color: #8696a0; }';
    document.head.appendChild(s);
  }

  async function handleFileUpload(e) {
    var files = Array.from(e.target.files);
    var attachments = [];
    for (var f of files) {
      var data = await toBase64(f);
      attachments.push({ name: f.name, type: f.type, size: f.size, data: data });
    }
    handleInput("", attachments);
    e.target.value = ''; // Reset
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  function togglePanel() {
    if (!ui.panel) createPanel();
    isPanelOpen = !isPanelOpen;
    ui.panel.style.display = isPanelOpen ? 'flex' : 'none';
    if (isPanelOpen) { ui.input.focus(); if (ui.messageList.children.length === 0) renderWelcome(); }
  }

  function renderWelcome() {
    ui.messageList.innerHTML = '';
    appendMessage('bot', `👋 <strong>V5 Active!</strong><br><br>I now support files, images, and more categories:<br>🏥 Health, 🍳 Recipes, 💰 Finance, 👤 People, and more.<br><br>Click the 📎 icon to save files!`);
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
    bubble.setAttribute('style', `background:${bg}; color:${color}; padding:10px 14px; border-radius:12px; max-width:85%; font-size:14.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); word-break: break-word; line-height: 1.5; border-${isUser ? 'top-right' : 'top-left'}-radius: 0;`);
    bubble.innerHTML = content;
    row.appendChild(bubble);
    ui.messageList.appendChild(row);
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  }

  function simulateTyping() {
    var status = document.getElementById('sn-status');
    if (status) { status.textContent = 'processing...'; setTimeout(() => { status.textContent = 'online'; }, 1000); }
  }

  function init() { loadNotes().then(() => { setInterval(createSidebarButton, 2000); console.log('🤖 [SaveNote] V5 Loaded.'); }); }
  if (document.readyState === 'complete') { setTimeout(init, 2000); }
  else { window.addEventListener('load', function() { setTimeout(init, 2000); }); }
})();
