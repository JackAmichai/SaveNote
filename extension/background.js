// SaveNote — Background Service Worker
// Handles extension installation and messaging

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open WhatsApp Web after installation
    chrome.tabs.create({ url: 'https://web.whatsapp.com/' });

    // Initialize storage with empty notes
    chrome.storage.local.set({
      notes: [],
      nextId: 1,
      settings: {
        autoCapture: true,
        showNotifications: true,
      },
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_NOTES') {
    chrome.storage.local.get(['notes'], (data) => {
      sendResponse({ notes: data.notes || [] });
    });
    return true; // async
  }

  if (message.type === 'SAVE_NOTE') {
    chrome.storage.local.get(['notes', 'nextId'], (data) => {
      const notes = data.notes || [];
      const nextId = data.nextId || 1;
      const note = {
        id: nextId,
        category: message.category || 'other',
        summary: message.summary,
        raw_message: message.raw_message || message.summary,
        metadata: message.metadata || {},
        created_at: new Date().toISOString(),
      };
      notes.unshift(note);
      chrome.storage.local.set({ notes, nextId: nextId + 1 }, () => {
        sendResponse({ success: true, note });
      });
    });
    return true;
  }

  if (message.type === 'DELETE_NOTE') {
    chrome.storage.local.get(['notes'], (data) => {
      const notes = (data.notes || []).filter((n) => n.id !== message.id);
      chrome.storage.local.set({ notes }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.type === 'OPEN_WHATSAPP') {
    chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
    sendResponse({ success: true });
    return true;
  }
});
