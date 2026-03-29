const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

let db;

/**
 * Initialize the database: create the data directory, open the DB, and create tables.
 */
function init() {
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');

  // Main notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      raw_message TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Full-text search virtual table
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      summary,
      raw_message,
      category,
      content='notes',
      content_rowid='id'
    );
  `);

  // Triggers to keep FTS index in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, summary, raw_message, category)
      VALUES (new.id, new.summary, new.raw_message, new.category);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, summary, raw_message, category)
      VALUES ('delete', old.id, old.summary, old.raw_message, old.category);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, summary, raw_message, category)
      VALUES ('delete', old.id, old.summary, old.raw_message, old.category);
      INSERT INTO notes_fts(rowid, summary, raw_message, category)
      VALUES (new.id, new.summary, new.raw_message, new.category);
    END;
  `);

  console.log('📦 Database initialized at', config.dbPath);
  return db;
}

/**
 * Save a note to the database.
 */
function saveNote(category, summary, rawMessage, metadata = {}) {
  const stmt = db.prepare(`
    INSERT INTO notes (category, summary, raw_message, metadata)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(category, summary, rawMessage, JSON.stringify(metadata));
  return result.lastInsertRowid;
}

/**
 * Sanitize a search string for FTS5 MATCH queries.
 * Strips characters that break FTS5 syntax.
 */
function sanitizeSearch(raw) {
  // Remove FTS5 special characters: ", *, (, ), :, ^, {, }, -, +
  let clean = raw.replace(/[\"*():{}\-\+\^~<>|!@#$%&=\[\]\\;,./`]/g, ' ');
  // Collapse multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

/**
 * Query notes by category and/or full-text search.
 */
function queryNotes({ category, search, limit = 20 } = {}) {
  if (search) {
    const cleanSearch = sanitizeSearch(search);
    if (!cleanSearch) {
      // If the search string was all special characters, fall back to recent notes
      return db.prepare('SELECT * FROM notes ORDER BY created_at DESC LIMIT ?').all(limit);
    }

    try {
      // Full-text search, optionally filtered by category
      let query = `
        SELECT notes.* FROM notes
        JOIN notes_fts ON notes.id = notes_fts.rowid
        WHERE notes_fts MATCH ?
      `;
      const params = [cleanSearch + '*']; // prefix search

      if (category) {
        query += ' AND notes.category = ?';
        params.push(category);
      }

      query += ' ORDER BY notes.created_at DESC LIMIT ?';
      params.push(limit);

      return db.prepare(query).all(...params);
    } catch (err) {
      // Fallback: use LIKE search if FTS fails
      console.warn('⚠️ FTS search failed, falling back to LIKE:', err.message);
      let query = 'SELECT * FROM notes WHERE (summary LIKE ? OR raw_message LIKE ?)';
      const likeParam = `%${cleanSearch}%`;
      const params = [likeParam, likeParam];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      return db.prepare(query).all(...params);
    }
  }

  if (category) {
    return db.prepare(`
      SELECT * FROM notes WHERE category = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(category, limit);
  }

  return db.prepare(`
    SELECT * FROM notes ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

/**
 * Get all distinct categories.
 */
function getCategories() {
  return db.prepare('SELECT DISTINCT category FROM notes ORDER BY category').all()
    .map(r => r.category);
}

/**
 * Delete a note by ID.
 */
function deleteNote(id) {
  return db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}

/**
 * Get a single note by ID.
 */
function getNote(id) {
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}

/**
 * Close the database connection.
 */
function close() {
  if (db) db.close();
}

module.exports = { init, saveNote, queryNotes, getCategories, deleteNote, getNote, close };
