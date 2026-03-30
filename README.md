# SaveNote — WhatsApp AI Memory Assistant 💬

> Save memories through WhatsApp, retrieve them when you need them. Powered by local AI.

![Demo](https://img.shields.io/badge/demo-live-6c5ce7?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Node](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)

## How It Works

1. **Send a WhatsApp message to yourself** — _"I parked on level 3, section B"_
2. **AI categorizes it** automatically (parking, book, idea, reminder, etc.)
3. **It's saved locally** in SQLite with full-text search
4. **Ask for it back** — send _"Where did I park?"_ and get an instant reply

All processing happens locally using [Ollama](https://ollama.com). No cloud AI, no data leaving your machine.

## Live Demo

Visit the [deployed dashboard](https://savenote.vercel.app) to see a demo with sample data.

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.com) installed and running
- A WhatsApp account

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/JackAmichai/SaveNote.git
cd SaveNote

# 2. Install dependencies
npm install

# 3. Pull an Ollama model
ollama pull llama3.2

# 4. Make sure Ollama is running
ollama serve

# 5. Configure (optional)
cp .env.example .env

# 6. Start SaveNote
npm start
```

On first run, scan the **QR code** in your terminal with **WhatsApp → Linked Devices → Link a Device**.

## Usage

Send messages to yourself on WhatsApp:

| You Say | SaveNote Does |
|---------|---------------|
| _"I parked on level 2, spot A14 at the mall"_ | 🅿️ Saves under **parking** |
| _"Just finished Atomic Habits by James Clear"_ | 📚 Saves under **book** |
| _"Remember to call Sarah tomorrow"_ | ⏰ Saves under **reminder** |
| _"Great pasta recipe: aglio e olio with chili"_ | 🍳 Saves under **recipe** |
| _"Where did I park?"_ | 🔍 Retrieves your parking info |
| _"What books have I read?"_ | 🔍 Lists your saved books |

## Web Dashboard

Open [http://localhost:3000](http://localhost:3000) to browse, search, and manage all your saved notes. You can also add notes manually from the dashboard.

## Configuration

Copy `.env.example` to `.env` and customize:

```
OLLAMA_MODEL=llama3.2         # Any Ollama model
OLLAMA_URL=http://localhost:11434
SELF_CHAT_ONLY=true            # Only listen to self-chat
DASHBOARD_PORT=3000
```

## Categories

Notes are auto-categorized into: `book`, `parking`, `idea`, `reminder`, `location`, `person`, `recipe`, `health`, `finance`, `other`.

## Architecture

```
SaveNote/
├── src/
│   ├── index.js        # Main orchestrator — message pipeline
│   ├── whatsapp.js     # WhatsApp Web client (QR auth)
│   ├── ai.js           # Ollama AI categorization & formatting
│   ├── db.js           # SQLite storage + FTS5 full-text search
│   ├── dashboard.js    # Express web server + REST API
│   └── config.js       # Environment configuration
├── public/
│   ├── index.html      # Dashboard UI (works standalone or with demo data)
│   ├── style.css       # Dashboard styles
│   ├── demo.js         # Demo mode for deployed version
│   └── favicon.svg     # App icon
├── tests/
│   ├── test-db.js      # Database unit tests
│   └── test-ai.js      # AI integration tests
├── data/               # SQLite database (auto-created)
└── vercel.json         # Vercel deployment config (static)
```

## Tech Stack

- **WhatsApp**: [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- **AI**: [Ollama](https://ollama.com) (local LLM)
- **Database**: [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with FTS5
- **Server**: [Express.js](https://expressjs.com/)
- **Frontend**: Vanilla HTML/CSS/JS

## License

MIT
