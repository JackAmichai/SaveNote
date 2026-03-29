const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');

let client;
let messageHandler = null;

/**
 * Initialize the WhatsApp Web client.
 * @param {Function} onMessage - Callback for incoming messages: (message, chatId) => void
 */
function init(onMessage) {
  messageHandler = onMessage;

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.authPath,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with your WhatsApp app:\n');
    qrcode.generate(qr, { small: true });
    console.log('');
  });

  client.on('ready', async () => {
    const info = client.info;
    console.log(`\n✅ WhatsApp connected as ${info.pushname} (${info.wid.user})`);
    console.log(`📞 Your number: ${info.wid.user}`);
    console.log(`💬 Listening for messages...\n`);
  });

  client.on('message_create', async (message) => {
    // message_create fires for both sent and received messages
    // We only care about messages the user sends (fromMe = true)
    try {
      // Skip messages not sent by us
      if (!message.fromMe) return;

      const chat = await message.getChat();

      if (config.selfChatOnly) {
        // Only process messages sent to your own chat (self-chat)
        const isOwnChat = chat.id.user === client.info.wid.user;
        if (!isOwnChat) return;
      }

      // Skip status broadcasts
      if (message.from === 'status@broadcast') return;

      // Skip empty messages
      const body = message.body?.trim();
      if (!body) return;

      // Skip very short messages (likely accidental)
      if (body.length < 3) return;

      console.log(`📩 New message: "${body.substring(0, 80)}${body.length > 80 ? '...' : ''}"`);

      if (messageHandler) {
        await messageHandler(body, chat.id._serialized);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error.message);
    }
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp authentication failed:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('🔌 WhatsApp disconnected:', reason);
  });

  console.log('🔄 Initializing WhatsApp Web client...');
  client.initialize();
}

/**
 * Send a reply to a specific chat.
 */
async function sendReply(chatId, text) {
  if (!client) throw new Error('WhatsApp client not initialized');
  await client.sendMessage(chatId, text);
}

/**
 * Destroy the WhatsApp client connection.
 */
async function destroy() {
  if (client) {
    await client.destroy();
  }
}

module.exports = { init, sendReply, destroy };
