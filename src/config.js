const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  ollama: {
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
  },
  selfChatOnly: process.env.SELF_CHAT_ONLY !== 'false',
  dashboardPort: parseInt(process.env.DASHBOARD_PORT, 10) || 3000,
  dbPath: path.join(__dirname, '..', 'data', 'savenote.db'),
  authPath: path.join(__dirname, '..', '.wwebjs_auth'),
};

module.exports = config;
