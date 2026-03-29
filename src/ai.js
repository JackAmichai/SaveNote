const config = require('./config');

const SYSTEM_PROMPT = `You are SaveNote, a personal memory assistant. Your job is to analyze a user's WhatsApp message and determine:

1. **Intent**: Is the user trying to SAVE information, or QUERY (retrieve) previously saved information?
2. **Category**: Classify the information into one of these categories:
   - book (books read, reading list, book recommendations)
   - parking (where the car is parked)
   - idea (random ideas, thoughts, inspirations)
   - reminder (things to remember, to-do items)
   - location (places visited, addresses, meeting spots)
   - person (people met, contact info, names to remember)
   - recipe (recipes, cooking tips, food-related)
   - health (health info, medications, appointments)
   - finance (expenses, payments, financial info)
   - other (anything that doesn't fit the above)
3. **Summary**: A concise, clear summary of the information.
4. **Metadata**: Extract structured key-value fields relevant to the category.

IMPORTANT RULES:
- Always respond with ONLY valid JSON, no markdown, no explanation.
- For SAVE intent, use this format:
  {"intent":"save","category":"<category>","summary":"<short summary>","metadata":{"key":"value",...}}
- For QUERY intent, use this format:
  {"intent":"query","category":"<category or null>","search":"<what to search for>"}
- If you cannot determine the intent, default to "save" with category "other".

Examples:
User: "I parked on level 3 section B at the mall"
Response: {"intent":"save","category":"parking","summary":"Parked on level 3, section B at the mall","metadata":{"level":"3","section":"B","location":"the mall"}}

User: "Just finished reading Atomic Habits by James Clear, great book about building habits"
Response: {"intent":"save","category":"book","summary":"Finished reading Atomic Habits by James Clear — about building habits","metadata":{"title":"Atomic Habits","author":"James Clear","status":"finished"}}

User: "Where did I park my car?"
Response: {"intent":"query","category":"parking","search":"parking car location"}

User: "What books have I read?"
Response: {"intent":"query","category":"book","search":"books read finished"}

User: "Remember to buy milk tomorrow"
Response: {"intent":"save","category":"reminder","summary":"Buy milk tomorrow","metadata":{"task":"buy milk","when":"tomorrow"}}

User: "Met Sarah from Google at the conference, she works on AI safety"
Response: {"intent":"save","category":"person","summary":"Met Sarah from Google at conference — works on AI safety","metadata":{"name":"Sarah","company":"Google","context":"conference","role":"AI safety"}}`;

/**
 * Send a message to Ollama and get a structured JSON response.
 */
async function categorize(messageText) {
  const url = `${config.ollama.url}/api/chat`;

  const payload = {
    model: config.ollama.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: messageText },
    ],
    stream: false,
    format: 'json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.message?.content;

    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Validate required fields
    if (!parsed.intent) {
      parsed.intent = 'save';
    }
    if (!parsed.category) {
      parsed.category = 'other';
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ Failed to parse AI response as JSON:', error.message);
      // Fallback: treat as a save with "other" category
      return {
        intent: 'save',
        category: 'other',
        summary: messageText,
        metadata: {},
      };
    }
    throw error;
  }
}

/**
 * Format query results into a readable WhatsApp message.
 */
async function formatResults(notes, originalQuery) {
  if (!notes || notes.length === 0) {
    return "🔍 I couldn't find anything matching your query. Try saving some information first!";
  }

  const url = `${config.ollama.url}/api/chat`;

  const notesText = notes.map((n, i) => {
    const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
    const metaStr = Object.entries(meta || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
    const date = new Date(n.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    return `${i + 1}. [${n.category}] ${n.summary} (${date})${metaStr ? '\n   Details: ' + metaStr : ''}`;
  }).join('\n');

  const payload = {
    model: config.ollama.model,
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant. Format the following saved notes into a clear, 
friendly WhatsApp reply for the user who asked: "${originalQuery}". 
Use emojis sparingly. Be concise but include all relevant details. 
Do NOT use markdown formatting — use plain text suitable for WhatsApp.`
      },
      { role: 'user', content: `Here are the matching notes:\n${notesText}` },
    ],
    stream: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Fallback to raw formatting
      return `📋 Here's what I found:\n\n${notesText}`;
    }

    const data = await response.json();
    return data.message?.content || `📋 Here's what I found:\n\n${notesText}`;
  } catch {
    return `📋 Here's what I found:\n\n${notesText}`;
  }
}

module.exports = { categorize, formatResults };
