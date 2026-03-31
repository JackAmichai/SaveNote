/**
 * SaveNote - WhatsApp Web Native Injector (Bookmarklet Version)
 * Pixel-Perfect Native Bot Mode without Extension - FIXED v4
 */
(function () {
    'use strict';
    var lastProcessedMessages = new Set();

    // ===== Configuration =====
    var CATEGORY_EMOJI = {
        book: '\uD83D\uDCDA',
        parking: '\uD83C\uDD70\uFE0F',
        idea: '\uD83D\uDCA1',
        reminder: '\u23F0',
        location: '\uD83D\uDCCD',
        person: '\uD83D\uDC64',
        recipe: '\uD83C\uDF73',
        health: '\uD83C\uDFE5',
        finance: '\uD83D\uDCB0',
        shopping: '\uD83D\uDED2',
        other: '\uD83D\uDCC4'
    };

    var CATEGORY_KEYWORDS = {
        parking: /\b(park|parked|parking|car|garage|level|floor|section|lot|spot|\u05D7\u05E0\u05D9|\u05D7\u05E0\u05D9\u05EA\u05D9|\u05D7\u05E0\u05D9\u05D4|\u05E8\u05DB\u05D1|\u05E7\u05D5\u05DE\u05D4)\b/i,
        book: /\b(book|read|reading|author|novel|chapter|finished|started|\u05E1\u05E4\u05E8|\u05E7\u05E8\u05D0\u05EA\u05D9|\u05E7\u05E8\u05D9\u05D0\u05D4|\u05DC\u05E7\u05E8\u05D9\u05D0\u05D4|\u05E1\u05D5\u05E4\u05E8)\b/i,
        idea: /\b(idea|thought|maybe|what if|concept|brainstorm|should try|\u05E8\u05E2\u05D9\u05D5\u05DF|\u05D0\u05D5\u05DC\u05D9|\u05DE\u05D4 \u05D0\u05DD)\b/i,
        reminder: /\b(remind|remember|don't forget|todo|task|buy|call|schedule|\u05EA\u05D6\u05DB\u05D5\u05E8\u05EA|\u05DC\u05D6\u05DB\u05D5\u05E8|\u05DC\u05E7\u05E0\u05D5\u05EA|\u05E4\u05D2\u05D9\u05E9\u05D4)\b/i,
        location: /\b(place|address|street|restaurant|cafe|bar|shop|found a|\u05DE\u05E7\u05D5\u05DD|\u05DB\u05EA\u05D5\u05D1\u05EA|\u05DE\u05E1\u05E2\u05D3\u05D4|\u05E8\u05D7\u05D5\u05D1)\b/i,
        person: /\b(met |person|name is|works at|contact|friend|colleague|\u05E4\u05D2\u05E9\u05EA\u05D9|\u05D7\u05D1\u05E8|\u05E2\u05D5\u05D1\u05D3 \u05D1)\b/i,
        recipe: /\b(recipe|cook|ingredient|food|dish|meal|bake|\u05DE\u05EA\u05DB\u05D5\u05DF|\u05D1\u05D9\u05E9\u05D5\u05DC|\u05D0\u05D5\u05DB\u05DC)\b/i,
        health: /\b(health|doctor|medicine|symptom|hospital|vitamin|\u05E8\u05D5\u05E4\u05D0|\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA|\u05EA\u05E8\u05D5\u05E4\u05D4)\b/i,
        finance: /\b(money|pay|paid|cost|price|expense|bank|\u05DB\u05E1\u05E3|\u05E9\u05D9\u05DC\u05DE\u05EA\u05D9|\u05E2\u05DC\u05D5\u05EA|\u05D4\u05D5\u05E6\u05D0\u05D4)\b/i,
        shopping: /\b(shop|shopping|buy|groceries|supermarket|market|shoes|clothes|\u05E7\u05E0\u05D9\u05D5\u05EA|\u05E1\u05D5\u05E4\u05E8|\u05DC\u05E7\u05E0\u05D5\u05EA)\b/i
    };

    var BOT_NAME = 'SaveNote AI';
    var BOT_COLOR = '#008069';

    function categorize(t) {
        for (var k in CATEGORY_KEYWORDS) {
            if (CATEGORY_KEYWORDS[k].test(t)) return k;
        }
        return 'other';
    }

    // localStorage helpers (bookmarklet-compatible)
    function loadNotes() {
        try {
            var data = localStorage.getItem('savenote_data');
            if (!data) return [];
            return JSON.parse(data) || [];
        } catch (e) {
            console.error('[SaveNote] Error loading notes:', e);
            return [];
        }
    }

    function saveNotes(notes) {
        try {
            localStorage.setItem('savenote_data', JSON.stringify(notes));
        } catch (e) {
            console.error('[SaveNote] Error saving notes:', e);
        }
    }

    // SVG for bot avatar
    var BOT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><circle cx="12" cy="12" r="12" fill="#008069"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold">SN</text></svg>';

    // SVG tail for bot message
    var TAIL_SVG = '<svg viewBox="0 0 8 13" width="8" height="13" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 8,0 0,13" fill="#fff"/></svg>';

    // ===== Identity Hijacker =====
    function hijackIdentity() {
        try {
            var bodyClass = document.body.className;
            if (bodyClass && bodyClass.includes('dark')) {
                document.body.setAttribute('data-theme', 'dark');
            } else {
                document.body.setAttribute('data-theme', 'light');
            }

            // Sidebar chat titles
            var chatTitles = document.querySelectorAll('span[title], [data-testid="contact-name"]');
            chatTitles.forEach(function(el) {
                var txt = el.textContent || el.getAttribute('title') || '';
                var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
                var isSelfChat = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.indexOf('chat with yourself') !== -1 || cleanTx === 'me' || cleanTx === '\u05D0\u05E0\u05D9' || txt.indexOf(BOT_NAME) !== -1;
                if (isSelfChat) {
                    if (txt !== BOT_NAME) el.textContent = BOT_NAME;
                    el.className += ' sn-sidebar-identity';
                    var parent = el.closest('[data-testid="cell-frame-container"]');
                    if (parent && !parent.dataset.snHijacked) {
                        var container = parent.querySelector('[data-testid="avatar-img-container"]');
                        if (container) {
                            container.innerHTML = BOT_SVG;
                            parent.dataset.snHijacked = 'true';
                        }
                    }
                }
            });

            // Header title
            var headerTitle = document.querySelector('header span[title], [data-testid="conversation-info-header-chat-title"]');
            if (headerTitle) {
                var txt = headerTitle.textContent || headerTitle.getAttribute('title') || '';
                var cleanTx = txt.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
                var isSelfChatHeader = cleanTx === 'you' || cleanTx === '(you)' || cleanTx.indexOf('chat with yourself') !== -1 || cleanTx === 'me' || cleanTx === '\u05D0\u05E0\u05D9' || txt.indexOf(BOT_NAME) !== -1;
                if (isSelfChatHeader) {
                    if (txt !== BOT_NAME) headerTitle.textContent = BOT_NAME;
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
        } catch (e) {
            console.error('[SaveNote] Error hijacking identity:', e);
        }
    }

    function simulateTyping() {
        try {
            var headerTitle = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
            if (headerTitle && headerTitle.textContent === BOT_NAME) {
                var subtitleContainer = document.querySelector('[data-testid="conversation-info-header-subtitle"]');
                if (subtitleContainer) {
                    var oldHTML = subtitleContainer.innerHTML;
                    subtitleContainer.innerHTML = '<span class="sn-typing-text">typing...</span>';
                    setTimeout(function() {
                        subtitleContainer.innerHTML = oldHTML;
                    }, 1400);
                }
            }
            var chatTitles = document.querySelectorAll('.sn-sidebar-identity');
            chatTitles.forEach(function(el) {
                var parent = el.closest('[data-testid="cell-frame-container"]');
                if (parent) {
                    var lastMsgContainer = parent.querySelector('[data-testid="last-msg-status"]');
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
        } catch (e) {
            console.error('[SaveNote] Error simulating typing:', e);
        }
    }

    function injectBotReply(html) {
        try {
            var chatPane = document.querySelector('[data-testid="conversation-panel-body"]') || document.querySelector('[data-testid="conversation-panel-messages"]') || document.querySelector('.copyable-area [role="application"]') || document.querySelector('#main .copyable-area') || document.querySelector('[role="list"]');
            if (!chatPane) {
                console.warn('[SaveNote] Chat pane not found for bot reply');
                return;
            }
            if (!document.getElementById('sn-bot-css')) {
                var style = document.createElement('style');
                style.id = 'sn-bot-css';
                style.textContent = '.sn-bot-msg-row{display:flex;flex-direction:column;width:100%;margin-bottom:2px;align-items:flex-start;animation:sn-fade-in .2s ease-out}@keyframes sn-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.sn-bot-bubble-wrapper{position:relative;display:flex;max-width:65%;margin-left:9px;margin-bottom:8px;margin-top:8px}.sn-bot-tail{position:absolute;top:0;left:-8px;width:8px;height:13px;color:#fff;z-index:100}[data-theme="dark"] .sn-bot-tail{color:#202c33}.sn-bot-bubble{background-color:#fff;border-radius:0 7.5px 7.5px 7.5px;padding:6px 7px 8px 9px;box-shadow:0 1px .5px rgba(11,20,26,.13);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111b21;font-size:14.2px;line-height:19px;display:flex;flex-direction:column;min-width:120px}[data-theme="dark"] .sn-bot-bubble{background-color:#202c33;color:#e9edef}.sn-bot-name{font-size:12.8px;font-weight:500;color:#008069;margin-bottom:2px;line-height:22px}[data-theme="dark"] .sn-bot-name{color:#00a884}.sn-bot-text{word-break:break-word;white-space:pre-wrap;margin-bottom:4px}.sn-bot-meta{display:flex;justify-content:flex-end;align-items:center;margin-top:-10px;float:right;margin-left:14px}.sn-bot-time{font-size:11px;color:#667781;margin-top:10px}[data-theme="dark"] .sn-bot-time{color:#8696a0}.sn-sidebar-identity{color:#008069!important;font-weight:500!important}[data-theme="dark"] .sn-sidebar-identity{color:#00a884!important}.sn-typing-text{color:#008069!important;font-size:13px!important;font-weight:400!important;font-family:inherit}[data-theme="dark"] .sn-typing-text{color:#00a884!important}';
                document.head.appendChild(style);
            }
            var nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var row = document.createElement('div');
            row.className = 'sn-bot-msg-row';
            row.innerHTML = '<div class="sn-bot-bubble-wrapper">' + TAIL_SVG + '<div class="sn-bot-bubble"><div class="sn-bot-name">' + BOT_NAME + '</div><div class="sn-bot-text">' + html + '</div><div class="sn-bot-meta"><span class="sn-bot-time">' + nowStr + '</span></div></div></div>';
            chatPane.appendChild(row);
            setTimeout(function() { chatPane.scrollTop = chatPane.scrollHeight + 500; }, 100);
        } catch (e) {
            console.error('[SaveNote] Error injecting bot reply:', e);
        }
    }

    function handleCommand(text) {
        var lower = text.toLowerCase();
        var notes = loadNotes();
        if (lower.indexOf('what') !== -1 && lower.indexOf('book') !== -1) {
            var books = notes.filter(function(n) { return n.category === 'book'; });
            simulateTyping();
            setTimeout(function() {
                if (books.length === 0) { injectBotReply('\uD83D\uDCDA You haven\'t saved any books yet.'); }
                else {
                    var list = books.slice(0, 5).map(function(b) { return '* ' + b.summary + '\n'; }).join('');
                    injectBotReply('\uD83D\uDCDA Here are your books:\n\n' + list);
                }
            }, 1500);
            return true;
        }
        if (lower.indexOf('where') !== -1 && lower.indexOf('park') !== -1) {
            var p = notes.find(function(n) { return n.category === 'parking'; });
            simulateTyping();
            setTimeout(function() {
                if (!p) { injectBotReply('\uD83C\uDD70\uFE0F No parking spot found.'); }
                else { injectBotReply('\uD83C\uDD70\uFE0F Last parking spot: \n"' + p.raw_message + '"'); }
            }, 1500);
            return true;
        }
        if (lower.indexOf('what') !== -1 && lower.indexOf('shopping') !== -1) {
            var shoppingList = notes.filter(function(n) { return n.category === 'shopping'; });
            simulateTyping();
            setTimeout(function() {
                if (shoppingList.length === 0) { injectBotReply('\uD83D\uDED2 Shopping list empty.'); }
                else {
                    var list = shoppingList.map(function(s) { return '* ' + s.summary + '\n'; }).join('');
                    injectBotReply('\uD83D\uDED2 Shopping list:\n\n' + list);
                }
            }, 1500);
            return true;
        }
        if (lower.indexOf('what') !== -1 && lower.indexOf('note') !== -1) {
            var all = notes.slice(0, 10);
            simulateTyping();
            setTimeout(function() {
                if (all.length === 0) { injectBotReply('\uD83D\uDCC4 No notes saved yet.'); }
                else {
                    var list = all.map(function(n) { return '* ' + CATEGORY_EMOJI[n.category] + ' ' + n.summary + '\n'; }).join('');
                    injectBotReply('\uD83D\uDCC4 Your latest notes:\n\n' + list);
                }
            }, 1500);
            return true;
        }
        if (/\b(help|hi|hello)\b/.test(lower)) {
            simulateTyping();
            setTimeout(function() {
                injectBotReply('\uD83D\uDC4B Hi, I\'m ' + BOT_NAME + '. **Message me anything to remember it.**\n\nAsk me:\n\u2022 What books did I read?\n\u2022 Where did I park?\n\u2022 What\'s on my shopping list?\n\u2022 Show me my notes');
            }, 1500);
            return true;
        }
        return false;
    }

    function processNewElements(el) {
        try {
            var msgContainers = [];
            if (el.querySelectorAll) {
                msgContainers = Array.prototype.slice.call(el.querySelectorAll('[data-testid="msg-container"], [data-testid="message-container"], [data-testid="msg-row"], [data-testid="message-row"], div[data-id], span[data-id], [data-id], [role="listitem"]'));
                if (el.matches && (el.matches('[data-testid="msg-container"]') || el.matches('[data-testid="message-container"]') || el.matches('[data-testid="msg-row"]') || el.matches('[data-testid="message-row"]') || el.matches('div[data-id]') || el.matches('span[data-id]') || el.matches('[data-id]') || el.matches('[role="listitem"]'))) {
                    msgContainers.push(el);
                }
            }
            for (var i = 0; i < msgContainers.length; i++) {
                var container = msgContainers[i];
                var dataId = container.getAttribute('data-id');
                var isOutgoingId = dataId && dataId.indexOf('true_') === 0;
                var isOutgoingClass = container.closest('.message-out') || container.closest('._ao3e') || (container.classList && container.classList.contains('message-out')) || (container.classList && container.classList.contains('_ao3e'));
                var hasOutgoingCheck = container.querySelector('[data-icon="msg-dblcheck"]') || container.querySelector('[data-icon="msg-check"]') || container.querySelector('[data-icon="check-multiple"]') || container.querySelector('[data-icon="check"]');
                var isIncomingCheck = container.closest('.message-in') || container.closest('._ao3d') || (container.classList && container.classList.contains('message-in')) || (container.classList && container.classList.contains('_ao3d'));
                if (isIncomingCheck) continue;
                var isOutgoing = isOutgoingId || isOutgoingClass || hasOutgoingCheck;
                if (!isOutgoing) continue;
                var textWrapper = container.querySelector('.copyable-text[data-pre-plain-text]') || container.querySelector('.copyable-text') || container.querySelector('.selectable-text') || container.querySelector('span.copyable-text') || container.querySelector('[data-pre-plain-text]') || container.querySelector('span[aria-hidden="true"]') || container.querySelector('.copyable-text span') || container.querySelector('span[data-pre-plain-text]');
                if (!textWrapper) continue;
                var text = textWrapper.textContent.trim();
                if (!text || text.length < 2) continue;
                if (lastProcessedMessages.has(text)) continue;
                lastProcessedMessages.add(text);
                console.log('[SaveNote] Intercepted new outgoing message:', text);
                var header = document.querySelector('header') || document.querySelector('[data-testid="conversation-header"]');
                if (header) {
                    var titleEl = header.querySelector('span[title]') || header.querySelector('[data-testid="conversation-info-header-chat-title"]') || header.querySelector('[data-testid="chat-subtitle"]');
                    var title = titleEl ? (titleEl.textContent || titleEl.getAttribute('title') || '') : '';
                    var cleanTx = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().toLowerCase();
                    var isSelf = title.indexOf(BOT_NAME) !== -1 || cleanTx.indexOf('(you)') !== -1 || cleanTx === 'you' || cleanTx === 'me' || cleanTx === '\u05D0\u05E0\u05D9';
                    if (isSelf) {
                        console.log('[SaveNote] Self-chat confirmed! Processing...');
                        if (!handleCommand(text)) {
                            (function(t) {
                                setTimeout(function() {
                                    var cat = categorize(t);
                                    var notesArr = loadNotes();
                                    notesArr.unshift({ id: Date.now(), category: cat, summary: t.length > 120 ? t.substring(0, 117) + '...' : t, raw_message: t, created_at: new Date().toISOString() });
                                    saveNotes(notesArr);
                                    simulateTyping();
                                    setTimeout(function() {
                                        injectBotReply('\u2705 Got it! Saved under **' + cat + '** ' + CATEGORY_EMOJI[cat] + ' \n"' + t + '"');
                                    }, 1500);
                                }, 200);
                            })(text);
                        }
                    } else {
                        console.log('[SaveNote] Not a self-chat. Skipping.');
                    }
                } else {
                    console.log('[SaveNote] Conversation header not found.');
                }
            }
        } catch (e) {
            console.error('[SaveNote] Error processing new elements:', e);
        }
    }

    // ===== Init =====
    setInterval(hijackIdentity, 1500);
    var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var mutation = mutations[i];
            for (var j = 0; j < mutation.addedNodes.length; j++) {
                var node = mutation.addedNodes[j];
                if (node.nodeType === Node.ELEMENT_NODE) {
                    processNewElements(node);
                }
            }
        }
    });
    var app = document.querySelector('#app') || document.body;
    if (app) observer.observe(app, { childList: true, subtree: true });
    console.log('[SaveNote] Pixel-Perfect Native Bookmarklet Ready - v4');
})();
