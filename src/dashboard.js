const express = require('express');
const path = require('path');
const db = require('./db');
const config = require('./config');

let server;

/**
 * Start the Express web dashboard.
 */
function start() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // CORS for local development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // --- API Routes ---

  // Get all notes (optionally filtered by category)
  app.get('/api/notes', (req, res) => {
    try {
      const { category, search, limit } = req.query;
      const notes = db.queryNotes({
        category: category || undefined,
        search: search || undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      });
      // Parse metadata JSON for each note and hoist attachments
      const parsed = notes.map(n => {
        const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {};
        const attachments = meta.attachments || [];
        delete meta.attachments;
        return {
          ...n,
          metadata: meta,
          attachments,
        };
      });
      res.json({ notes: parsed });
    } catch (error) {
      console.error('API error (GET /api/notes):', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a note manually
  app.post('/api/notes', (req, res) => {
    try {
      const { category, summary, raw_message, metadata, attachments } = req.body;

      if ((!summary || !summary.trim()) && (!attachments || attachments.length === 0)) {
        return res.status(400).json({ error: 'Summary or attachments are required' });
      }

      // Store attachments inside metadata to avoid DB schema changes
      const metaToSave = metadata || {};
      if (attachments && attachments.length > 0) {
        metaToSave.attachments = attachments;
      }

      const noteId = db.saveNote(
        category || 'other',
        summary ? summary.trim() : 'Attachment',
        summary ? (raw_message || summary.trim()) : 'Attachment',
        metaToSave
      );

      const note = db.getNote(noteId);
      const meta = typeof note.metadata === 'string' ? JSON.parse(note.metadata) : note.metadata || {};
      const savedAttachments = meta.attachments || [];
      delete meta.attachments;

      res.status(201).json({
        success: true,
        note: {
          ...note,
          metadata: meta,
          attachments: savedAttachments,
        },
      });
    } catch (error) {
      console.error('API error (POST /api/notes):', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all categories
  app.get('/api/categories', (req, res) => {
    try {
      const categories = db.getCategories();
      res.json({ categories });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a note
  app.delete('/api/notes/:id', (req, res) => {
    try {
      const result = db.deleteNote(parseInt(req.params.id, 10));
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health check (used by frontend to detect if backend is running)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('💥 Unhandled API error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  server = app.listen(config.dashboardPort, () => {
    console.log(`💬 Dashboard running at http://localhost:${config.dashboardPort}`);
  });

  return server;
}

/**
 * Stop the dashboard server.
 */
function stop() {
  if (server) {
    server.close();
  }
}

module.exports = { start, stop };
