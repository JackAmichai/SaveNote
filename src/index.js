const whatsapp = require('./whatsapp');
const ai = require('./ai');
const db = require('./db');
const dashboard = require('./dashboard');

console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   💬  SaveNote — AI Memory Assistant  💬  ║
║                                           ║
║   Send WhatsApp messages to yourself      ║
║   and I'll remember everything for you.   ║
║                                           ║
╚═══════════════════════════════════════════╝
`);

// Initialize database
db.init();

// Start web dashboard
dashboard.start();

// Message handler: the core pipeline
async function handleMessage(messageText, chatId) {
  try {
    console.log('🤖 Analyzing message with AI...');
    const result = await ai.categorize(messageText);
    console.log('📊 AI result:', JSON.stringify(result));

    if (result.intent === 'query') {
      // --- QUERY MODE ---
      console.log(`🔍 Query detected — searching for: ${result.search}`);

      const notes = db.queryNotes({
        category: result.category || undefined,
        search: result.search,
        limit: 10,
      });

      console.log(`📋 Found ${notes.length} matching notes`);

      const reply = await ai.formatResults(notes, messageText);
      await whatsapp.sendReply(chatId, reply);
      console.log('✅ Reply sent to WhatsApp\n');

    } else {
      // --- SAVE MODE ---
      const noteId = db.saveNote(
        result.category || 'other',
        result.summary || messageText,
        messageText,
        result.metadata || {}
      );

      console.log(`💾 Saved note #${noteId} [${result.category}]: ${result.summary}`);

      // Send confirmation via WhatsApp
      const categoryEmoji = {
        book: '📚', parking: '🅿️', idea: '💡', reminder: '⏰',
        location: '📍', person: '👤', contact: '📇', media: '🎬',
        recipe: '🍳', health: '🏥', finance: '💰', shopping: '🛒',
        other: '📌'
      };
      const emoji = categoryEmoji[result.category] || '📌';
      const confirmation = `${emoji} Got it! Saved under *${result.category}*:\n_"${result.summary}"_\n#${result.category}`;

      await whatsapp.sendReply(chatId, confirmation);
      console.log('✅ Confirmation sent to WhatsApp\n');
    }
  } catch (error) {
    console.error('❌ Error handling message:', error.message);

    // Try to notify the user
    try {
      await whatsapp.sendReply(chatId, '⚠️ Sorry, I had trouble processing that. Please try again.');
    } catch {
      // If we can't even send the error, just log it
    }
  }
}

// Initialize WhatsApp and start listening
whatsapp.init(handleMessage);

// Graceful shutdown
function shutdown() {
  console.log('\n🛑 Shutting down SaveNote...');
  dashboard.stop();
  whatsapp.destroy().catch(() => {});
  db.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
