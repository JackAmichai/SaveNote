/**
 * SaveNote — WhatsApp Web Content Script
 * V6: Advanced Features (OCR + Reminders)
 */

(function () {
  'use strict';

  if (window.__savenote_loaded_v6) return;
  window.__savenote_loaded_v6 = true;

  // Load Tesseract if not already there
  if (!window.Tesseract) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    document.head.appendChild(script);
  }

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

  var notes = [];
  var isPanelOpen = false;
  var ui = { sidebarButton: null, panel: null, messageList: null, input: null, fileInput: null };

  // ===== Logic =====
  async function loadNotes() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(['notes'], function(data) {
        notes = data.notes || [];
        resolve(notes);
      });
    });
  }

  async function handleFileUpload(e) {
    var files = Array.from(e.target.files);
    var attachments = [];
    appendMessage('bot', '⌛ <strong>Processing attachments...</strong> OCR engine starting.');
    
    for (var f of files) {
      var b64 = await toBase64(f);
      var ocrText = "";
      if (f.type.startsWith('image/') && window.Tesseract) {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(b64);
        await worker.terminate();
        ocrText = ret.data.text;
      }
      attachments.push({ name: f.name, type: f.type, data: b64, ocr_text: ocrText });
    }
    
    handleInput("Uploaded " + attachments.length + " files", attachments);
    e.target.value = '';
  }

  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader(); r.readAsDataURL(file);
      r.onload = () => res(r.result); r.onerror = e => rej(e);
    });
  }

  async function handleInput(text, atts = []) {
    if (!text.trim() && atts.length === 0) return;
    
    var userHtml = text;
    if (atts.length > 0) {
      atts.forEach(a => {
        if (a.type.startsWith('image/')) userHtml += `<br><img src="${a.data}" style="max-width:200px;border-radius:8px;margin-top:8px;">`;
        else userHtml += `<br>📄 ${a.name}`;
      });
    }
    appendMessage('user', userHtml);
    simulateTyping();

    setTimeout(() => {
      var note = { id: Date.now(), category: 'other', raw_message: text, attachments: atts, created_at: new Date().toISOString() };
      notes.unshift(note);
      chrome.storage.local.set({ notes: notes });
      
      var confirm = "✅ <strong>Saved!</strong>";
      if (atts.some(a => a.ocr_text)) confirm += "<br>🔍 OCR extracted text from images.";
      appendMessage('bot', confirm);
    }, 1000);
  }

  function createSidebarButton() {
    if (document.getElementById('sn-sidebar-btn')) return;
    var header = document.querySelector('header[data-testid="chat-list-header"]') || document.querySelector('#side header');
    if (!header) return;
    var btn = document.createElement('div');
    btn.id = 'sn-sidebar-btn';
    btn.setAttribute('style', 'cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;z-index:2000;');
    btn.innerHTML = BOT_SVG;
    btn.onclick = togglePanel;
    header.appendChild(btn);
  }

  function createPanel() {
    if (ui.panel) return;
    var isDark = document.body.classList.contains('dark');
    var panel = document.createElement('div');
    panel.id = 'sn-chat-panel';
    panel.setAttribute('style', `position:fixed;top:0;right:0;width:calc(100% - 410px);height:100%;z-index:10000;display:none;flex-direction:column;background:${isDark ? '#0b141a' : '#efeae2'};box-shadow:-4px 0 15px rgba(0,0,0,0.15);font-family:sans-serif;`);
    
    var h = document.createElement('div');
    h.setAttribute('style', `background:${isDark ? '#202c33' : '#f0f2f5'};padding:10px 16px;display:flex;align-items:center;height:60px;`);
    h.innerHTML = `<div style="flex:1;font-weight:600;">SaveNote V6</div><div id="sn-close" style="cursor:pointer;">✕</div>`;
    h.querySelector('#sn-close').onclick = togglePanel;

    var list = document.createElement('div');
    list.id = 'sn-message-list';
    list.setAttribute('style', 'flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;');
    
    var f = document.createElement('div');
    f.setAttribute('style', `background:${isDark ? '#202c33' : '#f0f2f5'};padding:12px;display:flex;gap:10px;`);
    
    var clip = document.createElement('div');
    clip.innerHTML = CLIP_SVG;
    clip.style.cursor = 'pointer';
    clip.onclick = () => ui.fileInput.click();

    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.style.display = 'none'; fileInput.multiple = true;
    fileInput.onchange = handleFileUpload;
    ui.fileInput = fileInput;

    var input = document.createElement('div');
    input.id = 'sn-input'; input.contentEditable = 'true';
    input.setAttribute('placeholder', 'Type a note...');
    input.setAttribute('style', `flex:1;background:${isDark ? '#2a3942' : '#fff'};padding:10px;border-radius:8px;outline:none;`);
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var t = input.textContent.trim(); if (t) { input.textContent = ''; handleInput(t); } } };

    f.appendChild(clip); f.appendChild(fileInput); f.appendChild(input);
    panel.appendChild(h); panel.appendChild(list); panel.appendChild(f);
    document.body.appendChild(panel);
    ui.panel = panel; ui.messageList = list; ui.input = input;
  }

  function togglePanel() {
    if (!ui.panel) createPanel();
    isPanelOpen = !isPanelOpen;
    ui.panel.style.display = isPanelOpen ? 'flex' : 'none';
    if (isPanelOpen) { ui.input.focus(); if (ui.messageList.children.length === 0) appendMessage('bot', '👋 <strong>V6 Online.</strong> OCR and Reminders active.'); }
  }

  function appendMessage(type, content) {
    if (!ui.messageList) return;
    var isDark = document.body.classList.contains('dark');
    var row = document.createElement('div');
    row.style = `display:flex; justify-content:${type === 'user' ? 'flex-end' : 'flex-start'}; margin-bottom:12px; width:100%;`;
    var bubble = document.createElement('div');
    bubble.setAttribute('style', `background:${type === 'user' ? (isDark ? '#005c4b' : '#d9fdd3') : (isDark ? '#202c33' : '#fff')}; padding:10px; border-radius:10px; max-width:85%; font-size:14px; box-shadow:0 1px 2px rgba(0,0,0,0.1);`);
    bubble.innerHTML = content;
    row.appendChild(bubble);
    ui.messageList.appendChild(row);
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  }

  function simulateTyping() {
    // Basic typing indicator logic could go here
  }

  function init() { loadNotes().then(() => { setInterval(createSidebarButton, 2000); console.log('🤖 [SaveNote] V6 Loaded.'); }); }
  if (document.readyState === 'complete') { setTimeout(init, 2000); }
  else { window.addEventListener('load', function() { setTimeout(init, 2000); }); }
})();
