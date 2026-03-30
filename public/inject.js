/**
 * SaveNote — WhatsApp Web Injector
 * Injected via bookmarklet. Creates a floating panel on WhatsApp Web.
 * No extension, no install, no backend required.
 */
(function () {
  'use strict';
  if (document.getElementById('sn-fab')) return; // already injected

  var EMOJIS = {
    book:'📚',parking:'🅿️',idea:'💡',reminder:'⏰',location:'📍',
    person:'👤',recipe:'🍳',health:'🏥',finance:'💰',other:'📌'
  };
  var KEYWORDS = {
    parking:/\b(park|parked|car|garage|level|floor|section|lot|spot)\b/i,
    book:/\b(book|read|reading|author|novel|chapter|finished|started)\b/i,
    idea:/\b(idea|thought|maybe|what if|concept|brainstorm|should try)\b/i,
    reminder:/\b(remind|remember|don't forget|todo|task|buy|call|schedule)\b/i,
    location:/\b(place|address|street|restaurant|cafe|bar|shop|found a)\b/i,
    person:/\b(met |person|name is|works at|contact|friend|colleague)\b/i,
    recipe:/\b(recipe|cook|ingredient|food|dish|meal|bake)\b/i,
    health:/\b(health|doctor|medicine|symptom|hospital|vitamin)\b/i,
    finance:/\b(money|pay|paid|cost|price|expense|bank|\$|₪|€)\b/i
  };

  function categorize(t){for(var k in KEYWORDS)if(KEYWORDS[k].test(t))return k;return'other';}
  function loadNotes(){try{return JSON.parse(localStorage.getItem('savenote_data'))||[];}catch(e){return[];}}
  function saveNotes(n){localStorage.setItem('savenote_data',JSON.stringify(n));}
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function ts(){return new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}

  // ===== Inject CSS =====
  var css = document.createElement('style');
  css.textContent = `
    #sn-fab{position:fixed;bottom:20px;left:20px;width:52px;height:52px;background:#008069;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:99999;box-shadow:0 3px 12px rgba(0,128,105,.4);transition:transform .2s;font-size:22px;user-select:none}
    #sn-fab:hover{transform:scale(1.1)}
    #sn-fab.hide{transform:scale(0);pointer-events:none}
    #sn-panel{position:fixed;top:0;right:-380px;width:370px;height:100vh;background:#fff;z-index:99998;display:flex;flex-direction:column;box-shadow:-3px 0 20px rgba(0,0,0,.1);transition:right .3s cubic-bezier(.4,0,.2,1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #sn-panel.open{right:0}
    .sn-hdr{background:#008069;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .sn-hdr-title{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
    .sn-hdr-btns{display:flex;gap:4px}
    .sn-hdr-btns button{width:32px;height:32px;border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:background .15s}
    .sn-hdr-btns button:hover{background:rgba(255,255,255,.25)}
    .sn-search{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f0f2f5;border-bottom:1px solid #e9edef;flex-shrink:0}
    .sn-search input{flex:1;border:0;background:0;font-size:13px;outline:0;color:#111b21;font-family:inherit}
    .sn-search input::placeholder{color:#8696a0}
    .sn-filters{display:flex;gap:5px;padding:8px 12px;overflow-x:auto;flex-shrink:0;border-bottom:1px solid #e9edef;scrollbar-width:none}
    .sn-filters::-webkit-scrollbar{display:none}
    .sn-filters button{padding:4px 10px;border:1px solid #e9edef;border-radius:16px;background:#fff;color:#54656f;font-size:11px;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .15s}
    .sn-filters button:hover{background:#f0f2f5}
    .sn-filters button.on{background:#008069;border-color:#008069;color:#fff}
    .sn-list{flex:1;overflow-y:auto;padding:6px}
    .sn-card{background:#fff;border:1px solid #e9edef;border-radius:8px;padding:10px 12px;margin-bottom:6px;transition:border-color .15s;position:relative}
    .sn-card:hover{border-color:#25d366}
    .sn-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
    .sn-cat{font-size:10px;font-weight:600;text-transform:uppercase;padding:2px 7px;border-radius:10px;background:rgba(0,128,105,.08);color:#008069}
    .sn-del{width:20px;height:20px;border:0;background:0;color:#8696a0;cursor:pointer;font-size:12px;border-radius:4px;opacity:0;transition:all .15s}
    .sn-card:hover .sn-del{opacity:1}
    .sn-del:hover{color:#ef4444;background:rgba(239,68,68,.08)}
    .sn-text{font-size:13px;color:#111b21;line-height:1.4;margin-bottom:4px;word-break:break-word}
    .sn-date{font-size:10px;color:#8696a0}
    .sn-empty{text-align:center;padding:40px 20px;color:#8696a0;font-size:13px}
    .sn-empty-icon{font-size:36px;margin-bottom:8px;opacity:.5}
    .sn-add{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-top:1px solid #e9edef;background:#f0f2f5;flex-shrink:0}
    .sn-add textarea{width:100%;padding:8px 10px;border:1px solid #e9edef;border-radius:8px;font-size:13px;resize:none;outline:0;background:#fff;color:#111b21;font-family:inherit;min-height:44px}
    .sn-add textarea:focus{border-color:#00a884}
    .sn-add textarea::placeholder{color:#8696a0}
    .sn-add-row{display:flex;gap:6px;justify-content:flex-end}
    .sn-add-row button{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:0;font-family:inherit;transition:all .15s}
    .sn-add-row .sn-cancel{background:#fff;color:#54656f;border:1px solid #e9edef}
    .sn-add-row .sn-save{background:#008069;color:#fff}
    .sn-add-row .sn-save:hover{background:#005c4b}
    .sn-foot{padding:8px 12px;text-align:center;font-size:10px;color:#8696a0;border-top:1px solid #e9edef;flex-shrink:0}
    .sn-toast{position:fixed;bottom:80px;left:20px;background:#111b21;color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;z-index:100000;opacity:0;transform:translateY(8px);transition:all .25s;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.15)}
    .sn-toast.show{opacity:1;transform:translateY(0)}
  `;
  document.head.appendChild(css);

  // ===== Build UI =====
  var fab = document.createElement('div');
  fab.id = 'sn-fab';
  fab.innerHTML = '📝';
  document.body.appendChild(fab);

  var panel = document.createElement('div');
  panel.id = 'sn-panel';
  panel.innerHTML = `
    <div class="sn-hdr">
      <div class="sn-hdr-title">📝 SaveNote</div>
      <div class="sn-hdr-btns">
        <button id="sn-add-btn" title="Add note">＋</button>
        <button id="sn-close" title="Close">✕</button>
      </div>
    </div>
    <div class="sn-search"><span>🔍</span><input id="sn-q" placeholder="Search notes..." autocomplete="off"></div>
    <div class="sn-filters" id="sn-filters"></div>
    <div class="sn-list" id="sn-list"></div>
    <div class="sn-add" id="sn-add" style="display:none">
      <textarea id="sn-input" placeholder="Type something to remember..." rows="2"></textarea>
      <div class="sn-add-row">
        <button class="sn-cancel" id="sn-cancel">Cancel</button>
        <button class="sn-save" id="sn-do-save">Save</button>
      </div>
    </div>
    <div class="sn-foot">SaveNote — your WhatsApp memory assistant</div>
  `;
  document.body.appendChild(panel);

  var toast = document.createElement('div');
  toast.className = 'sn-toast';
  document.body.appendChild(toast);

  // ===== State =====
  var open = false, filter = '', query = '';

  function toggle() {
    open = !open;
    panel.classList.toggle('open', open);
    fab.classList.toggle('hide', open);
    if (open) render();
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function(){toast.classList.remove('show');}, 2200);
  }

  function addNote(text) {
    if (!text.trim()) return;
    var notes = loadNotes();
    var cat = categorize(text);
    notes.unshift({id: Date.now(), category: cat, summary: text.length > 120 ? text.substring(0,117)+'...' : text, raw: text, date: new Date().toISOString()});
    saveNotes(notes);
    render();
    showToast(EMOJIS[cat] + ' Saved under ' + cat);
  }

  function deleteNote(id) {
    var notes = loadNotes().filter(function(n){return n.id !== id;});
    saveNotes(notes);
    render();
  }

  function render() {
    var notes = loadNotes();
    var fl = filter, q = query.toLowerCase();
    var filtered = notes.filter(function(n) {
      if (fl && n.category !== fl) return false;
      if (q && n.summary.toLowerCase().indexOf(q) === -1 && n.raw.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    // Filters
    var cats = {};
    notes.forEach(function(n){cats[n.category] = (cats[n.category]||0)+1;});
    var fhtml = '<button class="'+(filter===''?'on':'')+'" data-c="">All ('+notes.length+')</button>';
    Object.keys(cats).sort().forEach(function(c){
      fhtml += '<button class="'+(filter===c?'on':'')+'" data-c="'+c+'">'+(EMOJIS[c]||'📌')+' '+cats[c]+'</button>';
    });
    document.getElementById('sn-filters').innerHTML = fhtml;
    document.querySelectorAll('#sn-filters button').forEach(function(b){
      b.onclick = function(){filter = b.dataset.c; render();};
    });

    // Notes
    var list = document.getElementById('sn-list');
    if (filtered.length === 0) {
      list.innerHTML = '<div class="sn-empty"><div class="sn-empty-icon">'+(q?'🔍':'📝')+'</div><p>'+(q?'No notes match your search.':'No notes yet. Type something to remember!')+'</p></div>';
      return;
    }
    list.innerHTML = filtered.map(function(n){
      var d = new Date(n.date);
      var ds = d.toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      var em = EMOJIS[n.category]||'📌';
      return '<div class="sn-card" data-id="'+n.id+'"><div class="sn-card-top"><span class="sn-cat">'+em+' '+n.category+'</span><button class="sn-del" data-id="'+n.id+'">✕</button></div><div class="sn-text">'+esc(n.summary)+'</div><div class="sn-date">'+ds+'</div></div>';
    }).join('');
    list.querySelectorAll('.sn-del').forEach(function(b){
      b.onclick = function(e){e.stopPropagation(); deleteNote(parseInt(b.dataset.id));};
    });
  }

  // ===== Events =====
  fab.onclick = toggle;
  document.getElementById('sn-close').onclick = toggle;
  document.getElementById('sn-q').oninput = function(e){query = e.target.value; render();};
  document.getElementById('sn-add-btn').onclick = function(){
    var a = document.getElementById('sn-add');
    a.style.display = a.style.display === 'none' ? 'flex' : 'none';
    if (a.style.display === 'flex') document.getElementById('sn-input').focus();
  };
  document.getElementById('sn-cancel').onclick = function(){
    document.getElementById('sn-add').style.display = 'none';
    document.getElementById('sn-input').value = '';
  };
  document.getElementById('sn-do-save').onclick = function(){
    var input = document.getElementById('sn-input');
    addNote(input.value);
    input.value = '';
    document.getElementById('sn-add').style.display = 'none';
  };
  document.getElementById('sn-input').onkeydown = function(e){
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('sn-do-save').click(); }
  };

  showToast('📝 SaveNote ready! Click the button to open.');
})();
