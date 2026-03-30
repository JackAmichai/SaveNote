// SaveNote Extension Popup - Full WhatsApp Web Integration
// Handles notes display, categories, export, and WhatsApp actions

document.addEventListener('DOMContentLoaded', () => {
  // Category emoji mapping (must match content.js)
  const CATEGORY_EMOJI = {
    book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
    location: '📍', person: '👤', recipe: '🍳', health: '🏥',
    finance: '💰', shopping: '🛒', other: '📌'
  };

  const noteCountEl = document.getElementById('note-count');
  const catCountEl = document.getElementById('cat-count');
  const notesSectionEl = document.getElementById('notes-section');
  const notesListEl = document.getElementById('notes-list');
  const emptyStateEl = document.getElementById('empty-state');
  const openWhatsappBtn = document.getElementById('open-whatsapp');
  const exportBtn = document.getElementById('export-btn');

  // Load and display all notes
  function loadNotes() {
    chrome.storage.local.get(['notes'], (data) => {
      const notes = data.notes || [];
      noteCountEl.textContent = notes.length;
      const categories = [...new Set(notes.map((n) => n.category))];
      catCountEl.textContent = categories.length;

      if (notes.length > 0) {
        emptyStateEl.style.display = 'none';
        notesSectionEl.style.display = 'block';
        renderNotes(notes);
      } else {
        emptyStateEl.style.display = 'block';
        notesSectionEl.style.display = 'none';
      }
    });
  }

  // Render notes list
  function renderNotes(notes) {
    notesListEl.innerHTML = '';
    const recentNotes = notes.slice(0, 10); // Show last 10 notes

    recentNotes.forEach((note) => {
      const emoji = CATEGORY_EMOJI[note.category] || CATEGORY_EMOJI.other;
      const noteEl = document.createElement('div');
      noteEl.className = 'note-item';

      const date = new Date(note.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      const time = new Date(note.created_at).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });

      noteEl.innerHTML = `
        <span class="note-emoji">${emoji}</span>
        <div class="note-content">
          <div>${escapeHtml(note.summary)}</div>
          <div class="note-category">
            ${note.category} · ${date} ${time}
          </div>
        </div>
      `;
      notesListEl.appendChild(noteEl);
    });
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Open WhatsApp Web
  openWhatsappBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
    window.close();
  });

  // Export notes as JSON
  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get(['notes'], (data) => {
      const notes = data.notes || [];
      if (notes.length === 0) {
        alert('No notes to export!');
        return;
      }

      const exportData = JSON.stringify(notes, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `savenote-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // Initial load
  loadNotes();
});
