/**
 * Test the database module standalone.
 * Run: node tests/test-db.js
 */
const path = require('path');

// Override DB path for tests
process.env.OLLAMA_MODEL = 'test';
const config = require('../src/config');
config.dbPath = path.join(__dirname, '..', 'data', 'test-savenote.db');

const db = require('../src/db');
const fs = require('fs');

// Clean up test DB if it exists
if (fs.existsSync(config.dbPath)) {
  fs.unlinkSync(config.dbPath);
}

console.log('🧪 Testing Database Module\n');

// Init
db.init();
console.log('✅ Database initialized');

// Save notes
const id1 = db.saveNote('book', 'Finished Atomic Habits by James Clear', 'Just finished reading Atomic Habits', {
  title: 'Atomic Habits', author: 'James Clear', status: 'finished'
});
console.log(`✅ Saved note #${id1} (book)`);

const id2 = db.saveNote('parking', 'Parked on level 3, section B at the mall', 'I parked on level 3 section B at the mall', {
  level: '3', section: 'B', location: 'the mall'
});
console.log(`✅ Saved note #${id2} (parking)`);

const id3 = db.saveNote('idea', 'Build an app that tracks daily habits', 'Had an idea to build a habit tracker app', {
  topic: 'app development'
});
console.log(`✅ Saved note #${id3} (idea)`);

const id4 = db.saveNote('book', 'Started reading Dune by Frank Herbert', 'Started Dune by Frank Herbert today', {
  title: 'Dune', author: 'Frank Herbert', status: 'started'
});
console.log(`✅ Saved note #${id4} (book)`);

// Query all
const all = db.queryNotes();
console.log(`\n📋 All notes (${all.length}):`);
all.forEach(n => console.log(`  [${n.category}] ${n.summary}`));
console.assert(all.length === 4, `Expected 4 notes, got ${all.length}`);

// Query by category
const books = db.queryNotes({ category: 'book' });
console.log(`\n📚 Books (${books.length}):`);
books.forEach(n => console.log(`  ${n.summary}`));
console.assert(books.length === 2, `Expected 2 books, got ${books.length}`);

// Full-text search
const searchResults = db.queryNotes({ search: 'Atomic' });
console.log(`\n🔍 Search "Atomic" (${searchResults.length}):`);
searchResults.forEach(n => console.log(`  [${n.category}] ${n.summary}`));
console.assert(searchResults.length >= 1, `Expected at least 1 result for "Atomic"`);

// Get categories
const categories = db.getCategories();
console.log(`\n📂 Categories: ${categories.join(', ')}`);
console.assert(categories.length === 3, `Expected 3 categories, got ${categories.length}`);

// Delete
db.deleteNote(id3);
const afterDelete = db.queryNotes();
console.assert(afterDelete.length === 3, `Expected 3 notes after delete, got ${afterDelete.length}`);
console.log('\n✅ Delete works');

// Cleanup
db.close();
fs.unlinkSync(config.dbPath);

console.log('\n✅ All database tests passed! 🎉\n');
