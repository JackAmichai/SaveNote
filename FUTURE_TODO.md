# SaveNote - Future Expansion Strategy 🚀

This document outlines how to move SaveNote beyond just a WhatsApp Web extension to a truly cross-platform AI assistant.

## 1. Cross-Platform Injection (Mobile & Desktop)

Since we cannot easily inject code into the closed-source WhatsApp mobile apps (iOS/Android), we have two main strategies for a native mobile experience:

### A. The "Pure Bot" Strategy (Recommended)
Instead of a browser extension, we run a background server using **`whatsapp-web.js`** or the **Official WhatsApp Business API**.
- **How it works**: The bot "logs in" as a separate WhatsApp session on a server. It stays online 24/7.
- **Benefits**: It works on all devices (Mobile, Tablet, Desktop) because it's a real chat partner, not a UI hack. 
- **Implementation**:
    1.  Host a Node.js server with `whatsapp-web.js`.
    2.  User scans the QR code once to link their account (or we use a dedicated bot number).
    3.  Server listens for messages and uses the same Ollama/AI logic to reply.

### B. The "System-Wide Share" Strategy (Mobile)
On iOS and Android, we can build a small "SaveNote" app that appears in the system's **Share Sheet**.
- **How it works**: User long-presses a message in WhatsApp -> Share -> SaveNote.
- **Benefits**: Native OS feel, stable, and doesn't rely on third-party app reverse-engineering.

## 2. Universal Retrieval
- **Voice Commands**: Integrate with Siri Shortcuts or Android Intents to allow "Hey Siri, where did I park?".
- **Searchable Dashboard**: Enhance the existing dashboard to be a PWA (Progressive Web App) that can be installed on home screens.

## 3. Advanced AI Integration
- **Ollama on Mobile**: Research "MLX" or similar for local LLM execution on high-end mobile devices, removing the need for a desktop server.
- **Proactive Reminders**: The bot could message the user: "You parked 2 hours ago, did you want to move the car?".

---
*Created on: 2026-03-30*
