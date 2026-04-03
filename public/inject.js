/**
 * SaveNote — WhatsApp Web Native Injector (Bookmarklet Version)
 * V5: Advanced Categorization + File/Image Support
 */

(function () {
  'use strict';

  if (window.__savenote_loaded_v5) {
    if (window.__sn_toggle) window.__sn_toggle();
    return;
  }
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
    location: /\b(location|place|address|street|restaurant|cafe|bar|store|found a|מקום|כתובת|מסעדה|רחוב)\b/i,
    person: /\b(met |person|name is|works at|contact|friend|colleague|פגשתי|חבר|עובד ב)\b/i,
    recipe: /\b(recipe|cook|ingredient|food|dish|meal|bake|fry|מתכון|בישול|אוכל)\b/i,
    health: /\b(health|doctor|medicine|medication|symptom|diagnosis|hospital|רופא|בריאות|תרופה)\b/i,
    finance: /\b(money|pay|paid|cost|price|expense|salary|bank|finance|budget|\$|₪|כסף|שילמתי|עלות|הוצאה)\b/i,
  };

  // ===== Storage =====
  var _mem = [];
  function loadNotes() { try { var d = localStorage.getItem('savenote_data'); return d ? JSON.parse(d) : _mem; } catch(e) { return _mem; } }
  function saveNotes(n) { try { localStorage.setItem('savenote_data', JSON.stringify(n)); } catch(e) { _mem = n; } }

  // ===== Logic =====
  function categorize(t) { for (var k in CATEGORY_KEYWORDS) if (CATEGORY_KEYWORDS[k].test(t)) return k; return 'other'; }
  function searchNotes(q) {
    var notes = loadNotes(); var l = q.toLowerCase(); var cat = categorize(l);
    return notes.filter(function(n) {
      return (n.category === cat && cat !== 'other') || n.raw_message.toLowerCase().includes(l.replace(/\b(where|what|is|my|show|me|did|i)\b/gi, '').trim());
    });
  }

  // ===== UI State =====
  var isPanelOpen = false;
  var ui = { panel: null, messageList: null, input: null, fileInput: null };

  function createSidebarButton() {
    if (document.getElementById('sn-sidebar-btn')) return;
    var header = document.querySelector('header[data-testid="chat-list-header"]') || document.querySelector('#side header') || document.querySelector('div[data-testid="side"] header');
    if (!header) return;
    var btn = document.createElement('div');
    btn.id = 'sn-sidebar-btn';
    btn.setAttribute('style', 'cursor:pointer !important; width:40px !important; height:40px !important; display:flex !important; align-items:center !important; justify-content:center !important; border-radius:50% !important; margin: 0 4px !important; transition: background 0.2s !important; z-index: 2000 !important; pointer-events: all !important;');
    btn.innerHTML = BOT_SVG;
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
    panel.setAttribute('style', `position:fixed !important; top:0 !important; right:0 !important; width:calc(100% - 410px) !important; height:100% !important; z-index:10000 !important; display:none; flex-direction:column !important; background:${bgColor} !important; box-shadow: -4px 0 15px rgba(0,0,0,0.15) !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;`);
    if (window.innerWidth < 900) panel.style.width = '100%';

    var h = document.createElement('div');
    h.setAttribute('style', `background:${headerColor} !important; padding:10px 16px !important; display:flex !important; align-items:center !important; height:60px !important; border-bottom:1px solid rgba(0,0,0,0.08) !important;`);
    h.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-right:15px;background:white;display:flex;align-items:center;justify-content:center;">${BOT_SVG}</div><div style="flex:1;"><div style="font-weight:600;color:${textColor};font-size:16px;">${BOT_NAME}</div><div id="sn-status" style="font-size:13px;color:#00a884;">online</div></div><div id="sn-close" style="cursor:pointer;font-size:24px;color:#667781;padding:5px 10px;">✕</div>`;
    h.querySelector('#sn-close').onclick = togglePanel;

    var list = document.createElement('div');
    list.id = 'sn-message-list';
    list.setAttribute('style', 'flex:1;overflow-y:auto;padding:20px 8%;display:flex;flex-direction:column;scroll-behavior:smooth;');
    
    var f = document.createElement('div');
    f.setAttribute('style', `background:${headerColor} !important; padding:12px 16px !important; display:flex !important; align-items:center !important; border-top:1px solid rgba(0,0,0,0.05) !important; gap:12px;`);
    
    var clip = document.createElement('div');
    clip.innerHTML = CLIP_SVG;
    clip.setAttribute('style', 'cursor:pointer;color:#8696a0;display:flex;align-items:center;');
    clip.onclick = function() { ui.fileInput.click(); };

    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.style.display = 'none'; fileInput.multiple = true;
    fileInput.onchange = handleFileUpload;
    ui.fileInput = fileInput;

    var input = document.createElement('div');
    input.id = 'sn-input'; input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Save a note or file...');
    input.setAttribute('style', `flex:1;background:${isDark ? '#2a3942' : '#ffffff'};color:${textColor};padding:10px 14px;border-radius:8px;font-size:15px;min-height:20px;max-height:120px;overflow-y:auto;outline:none;`);
    input.onkeydown = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var t = this.textContent.trim(); if (t) { this.textContent = ''; processNote(t, []); } } };

    f.appendChild(clip); f.appendChild(fileInput); f.appendChild(input);
    panel.appendChild(h); panel.appendChild(list); panel.appendChild(f);
    document.body.appendChild(panel);
    ui.panel = panel; ui.messageList = list; ui.input = input;

    var s = document.createElement('style');
    s.innerHTML = '#sn-input:empty:before { content: attr(placeholder); color: #8696a0; }';
    document.head.appendChild(s);
  }

  async function handleFileUpload(e) {
    var files = Array.from(e.target.files);
    var atts = [];
    for (var f of files) {
      var data = await toBase64(f);
      atts.push({ name: f.name, type: f.type, data: data });
    }
    processNote("", atts);
    e.target.value = '';
  }

  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader(); r.readAsDataURL(file);
      r.onload = () => res(r.result); r.onerror = e => rej(e);
    });
  }

  function processNote(text, atts) {
    var html = text;
    if (atts && atts.length > 0) {
      atts.forEach(a => {
        if (a.type.startsWith('image/')) html += `<br><img src="${a.data}" style="max-width:200px;border-radius:8px;margin-top:8px;">`;
        else html += `<br><div style="padding:8px;background:rgba(0,0,0,0.05);border-radius:4px;margin-top:8px;font-size:12px;">📄 ${a.name}</div>`;
      });
    }
    appendMessage('user', html);
    var status = document.getElementById('sn-status');
    if (status) status.textContent = 'processing...';
    
    var lower = text.toLowerCase();
    setTimeout(function() {
        if (lower.startsWith('return ') || lower.startsWith('query ') || lower.includes('where') || lower.includes('what') || lower.includes('show')) {
            var results = searchNotes(lower.replace(/^(return|query)\s+/i, ''));
            if (results.length > 0) {
                var res = `🔍 <strong>Found ${results.length} notes:</strong><br><br>` + 
                          results.slice(0, 3).map(function(r) { 
                            var m = `${CATEGORY_EMOJI[r.category]} "${r.raw_message}"`;
                            if (r.atts) r.atts.forEach(at => {
                              if (at.type.startsWith('image/')) m += `<br><img src="${at.data}" style="max-width:180px;border-radius:4px;margin-top:4px;">`;
                              else m += `<br>📄 ${at.name}`;
                            });
                            return m;
                          }).join('<br><hr style="border:0;border-top:1px solid rgba(0,0,0,0.05);margin:10px 0;"><br>');
                appendMessage('bot', res);
            } else { appendMessage('bot', `❌ Sorry, I couldn't find anything matching that.`); }
        } else {
            var content = lower.startsWith('post ') ? text.substring(5) : text;
            var cat = categorize(content);
            var notes = loadNotes();
            notes.unshift({ category: cat, raw_message: content, atts: atts || [], created_at: new Date().toISOString() });
            saveNotes(notes);
            appendMessage('bot', `${CATEGORY_EMOJI[cat]} <strong>Saved to ${cat}!</strong><br>Note and attachments stored.`);
        }
        if (status) status.textContent = 'online';
    }, 1000);
  }

  function togglePanel() {
    if (!ui.panel) createPanel();
    isPanelOpen = !isPanelOpen;
    ui.panel.style.display = isPanelOpen ? 'flex' : 'none';
    if (isPanelOpen) { ui.input.focus(); if (ui.messageList.children.length === 0) renderWelcome(); }
  }
  window.__sn_toggle = togglePanel;

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

  setInterval(createSidebarButton, 2000);
  console.log('🤖 [SaveNote] V5 Bookmarklet Ready.');
  togglePanel();
})();
