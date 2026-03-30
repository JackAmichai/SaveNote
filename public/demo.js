/**
 * SaveNote Demo Mode
 * Provides realistic sample data when the backend API is unreachable (e.g., on Vercel).
 */

const DEMO_NOTES = [
  {
    id: 1,
    category: 'book',
    summary: 'Finished reading Atomic Habits by James Clear — incredible book on building good habits through small changes',
    raw_message: 'Just finished reading Atomic Habits by James Clear. Incredible book about building good habits through small changes.',
    metadata: { title: 'Atomic Habits', author: 'James Clear', status: 'finished' },
    created_at: '2026-03-28 14:30:00',
  },
  {
    id: 2,
    category: 'parking',
    summary: 'Parked on level 3, section B at Dizengoff Center',
    raw_message: 'I parked on level 3 section B at Dizengoff Center',
    metadata: { level: '3', section: 'B', location: 'Dizengoff Center' },
    created_at: '2026-03-29 09:15:00',
  },
  {
    id: 3,
    category: 'idea',
    summary: 'Build a habit tracker app that gamifies daily streaks with XP and achievements',
    raw_message: 'Had an idea to build a habit tracker app that gamifies daily streaks with XP and achievements',
    metadata: { topic: 'app development', priority: 'high' },
    created_at: '2026-03-27 22:45:00',
  },
  {
    id: 4,
    category: 'reminder',
    summary: 'Call dentist to schedule cleaning — Dr. Cohen on Rothschild Blvd',
    raw_message: 'Remember to call the dentist to schedule a cleaning. Dr. Cohen on Rothschild Blvd.',
    metadata: { task: 'call dentist', who: 'Dr. Cohen', where: 'Rothschild Blvd' },
    created_at: '2026-03-29 08:00:00',
  },
  {
    id: 5,
    category: 'book',
    summary: 'Started reading Dune by Frank Herbert — epic sci-fi worldbuilding',
    raw_message: 'Started reading Dune by Frank Herbert. The worldbuilding is epic.',
    metadata: { title: 'Dune', author: 'Frank Herbert', status: 'started' },
    created_at: '2026-03-26 20:10:00',
  },
  {
    id: 6,
    category: 'person',
    summary: 'Met Sarah from Google at the AI conference — she works on AI safety research',
    raw_message: 'Met Sarah from Google at the AI conference, she works on AI safety',
    metadata: { name: 'Sarah', company: 'Google', context: 'AI conference', role: 'AI safety researcher' },
    created_at: '2026-03-25 16:30:00',
  },
  {
    id: 7,
    category: 'recipe',
    summary: 'Amazing aglio e olio recipe: garlic, chili flakes, olive oil, parsley, spaghetti — cook pasta al dente',
    raw_message: 'Great pasta recipe: aglio e olio with chili flakes. Key is cooking garlic until golden, not brown.',
    metadata: { dish: 'Aglio e Olio', cuisine: 'Italian', difficulty: 'easy' },
    created_at: '2026-03-24 19:00:00',
  },
  {
    id: 8,
    category: 'finance',
    summary: 'Paid rent for March — ₪4,500 to landlord via bank transfer',
    raw_message: 'Paid rent for March, 4500 NIS to landlord via bank transfer',
    metadata: { amount: '₪4,500', type: 'rent', method: 'bank transfer' },
    created_at: '2026-03-01 10:00:00',
  },
  {
    id: 9,
    category: 'location',
    summary: 'Found an amazing coffee shop — Nahat on Levontin St, great pour-over coffee',
    raw_message: 'Found an amazing coffee shop called Nahat on Levontin St. Great pour-over coffee.',
    metadata: { name: 'Nahat', street: 'Levontin St', type: 'coffee shop' },
    created_at: '2026-03-23 11:20:00',
  },
  {
    id: 10,
    category: 'health',
    summary: 'Blood test results — vitamin D is low, doctor recommended 1000 IU daily supplement',
    raw_message: 'Got blood test results back. Vitamin D is low. Doctor said to take 1000 IU supplement daily.',
    metadata: { test: 'blood work', finding: 'low vitamin D', action: '1000 IU daily' },
    created_at: '2026-03-20 15:45:00',
  },
  {
    id: 11,
    category: 'idea',
    summary: 'AI-powered recipe recommender based on what\'s in the fridge — snap a photo and get recipes',
    raw_message: 'Idea: an AI app where you snap a photo of whats in your fridge and it suggests recipes',
    metadata: { topic: 'AI/food', type: 'app idea' },
    created_at: '2026-03-22 21:30:00',
  },
  {
    id: 12,
    category: 'book',
    summary: 'Added to reading list: Deep Work by Cal Newport — recommended by Sarah from Google',
    raw_message: 'Sarah recommended Deep Work by Cal Newport. Adding to my reading list.',
    metadata: { title: 'Deep Work', author: 'Cal Newport', status: 'to-read', recommended_by: 'Sarah' },
    created_at: '2026-03-25 17:00:00',
  },
];

class DemoMode {
  constructor() {
    this.notes = [...DEMO_NOTES];
    this.nextId = Math.max(...this.notes.map(n => n.id)) + 1;
  }

  getNotes(category = '', search = '') {
    let filtered = [...this.notes];

    if (category) {
      filtered = filtered.filter(n => n.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.summary.toLowerCase().includes(q) ||
        n.raw_message.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        Object.values(n.metadata).some(v => String(v).toLowerCase().includes(q))
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  }

  getCategories() {
    return [...new Set(this.notes.map(n => n.category))].sort();
  }

  deleteNote(id) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.notes.splice(idx, 1);
      return true;
    }
    return false;
  }

  addNote(category, summary, attachments = []) {
    const note = {
      id: this.nextId++,
      category: category || 'other',
      summary,
      raw_message: summary,
      metadata: {},
      attachments: attachments,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.notes.unshift(note);
    return note;
  }
}

// Singleton
window.SaveNoteDemo = new DemoMode();
