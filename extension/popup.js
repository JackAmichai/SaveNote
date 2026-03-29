// SaveNote Extension Popup
document.addEventListener('DOMContentLoaded', () => {
  // Load stats
  chrome.storage.local.get(['notes'], (data) => {
    const notes = data.notes || [];
    document.getElementById('note-count').textContent = notes.length;
    const categories = [...new Set(notes.map((n) => n.category))];
    document.getElementById('cat-count').textContent = categories.length;
  });

  // Open WhatsApp Web
  document.getElementById('open-whatsapp').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
    window.close();
  });
});
