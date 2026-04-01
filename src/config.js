const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  ai_provider: process.env.AI_PROVIDER || 'ollama', // 'ollama', 'groq', 'openai'
  ollama: {
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
  },
  groq: {
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKey: process.env.GROQ_API_KEY,
  },
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
  },
  selfChatOnly: process.env.SELF_CHAT_ONLY !== 'false',
  dashboardPort: parseInt(process.env.DASHBOARD_PORT, 10) || 3000,
  dbPath: path.join(__dirname, '..', 'data', 'savenote.db'),
  authPath: path.join(__dirname, '..', '.wwebjs_auth'),
};

module.exports = config;
