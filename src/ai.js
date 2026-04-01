const config = require('./config');

const SYSTEM_PROMPT = `You are SaveNote, a personal memory assistant. Your job is to analyze a user's WhatsApp message and determine:

1. **Intent**: Is the user trying to SAVE information, or QUERY (retrieve) previously saved information?
2. **Category**: Classify the information into one of these categories:
   - book: books read, reading list, book recommendations
   - parking: where the car is parked, level, section, spot number
   - idea: random ideas, thoughts, inspirations, startup concepts
   - reminder: things to remember, to-do items, tasks
   - location: places visited, addresses, meeting spots, coordinates
   - person: people met, context of meeting
   - contact: phone numbers, emails, social media handles
   - media: movies, TV shows, music, podcasts, articles, videos
   - recipe: recipes, cooking tips, food-related
   - health: health info, medications, appointments, symptoms
   - finance: expenses, payments, prices, budget items
   - shopping: shopping lists, groceries, items to buy
   - other: anything that doesn't fit the above

3. **Summary**: A concise, clear summary of the information (max 15 words).
4. **Metadata**: Extract structured key-value fields relevant to the category. Be as specific as possible.

IMPORTANT RULES:
- Always respond with ONLY valid JSON, no markdown, no explanation.
- For SAVE intent, use this format:
  {"intent":"save","category":"<category>","summary":"<short summary>","metadata":{"key":"value",...}}
- For QUERY intent, use this format:
  {"intent":"query","category":"<category or null>","search":"<what to search for>"}
- If you cannot determine the intent, default to "save" with category "other".
- Do not include sensitive data like passwords in metadata unless explicitly part of the note.

Examples:
User: "I parked on level 3 section B at the mall"
Response: {"intent":"save","category":"parking","summary":"Parked on level 3, section B at the mall","metadata":{"level":"3","section":"B","location":"the mall"}}

User: "Just finished watching Inception, what a mind-bending movie"
Response: {"intent":"save","category":"media","summary":"Watched Inception movie","metadata":{"title":"Inception","type":"movie","sentiment":"positive"}}

User: "Where did I park my car?"
Response: {"intent":"query","category":"parking","search":"parking car location"}`;

/**
 * Helper to call the selected AI provider.
 */
async function callAi(messages, jsonFormat = false) {
  const provider = config.ai_provider || 'ollama';
  let url, headers, body;

  if (provider === 'ollama') {
    url = `${config.ollama.url}/api/chat`;
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({
      model: config.ollama.model,
      messages,
      stream: false,
      format: jsonFormat ? 'json' : undefined,
    });
  } else if (provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.groq.apiKey}`,
    };
    body = JSON.stringify({
      model: config.groq.model,
      messages,
      response_format: jsonFormat ? { type: 'json_object' } : undefined,
    });
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openai.apiKey}`,
    };
    body = JSON.stringify({
      model: config.openai.model,
      messages,
      response_format: jsonFormat ? { type: 'json_object' } : undefined,
    });
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const response = await fetch(url, { method: 'POST', headers, body });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${provider}): ${errorText}`);
  }

  const data = await response.json();
  
  if (provider === 'ollama') {
    return data.message?.content;
  } else {
    // OpenAI and Groq share the same response format
    return data.choices?.[0]?.message?.content;
  }
}

/**
 * Send a message to AI and get a structured JSON response.
 */
async function categorize(messageText) {
  try {
    const content = await callAi([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: messageText },
    ], true);

    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Validate required fields
    if (!parsed.intent) parsed.intent = 'save';
    if (!parsed.category) parsed.category = 'other';
    if (!parsed.metadata) parsed.metadata = {};

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

  const notesText = notes.map((n, i) => {
    const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
    const metaStr = Object.entries(meta || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
    const date = new Date(n.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    return `${i + 1}. [${n.category}] ${n.summary} (${date})${metaStr ? '\n   Details: ' + metaStr : ''}`;
  }).join('\n');

  try {
    const content = await callAi([
      {
        role: 'system',
        content: `You are a helpful assistant. Format the following saved notes into a clear, 
friendly WhatsApp reply for the user who asked: "${originalQuery}". 
Use emojis sparingly. Be concise but include all relevant details. 
Do NOT use markdown formatting — use plain text suitable for WhatsApp.`
      },
      { role: 'user', content: `Here are the matching notes:\n${notesText}` },
    ]);

    return content || `📋 Here's what I found:\n\n${notesText}`;
  } catch (error) {
    console.warn('⚠️ Falling back to raw formatting due to AI error:', error.message);
    return `📋 Here's what I found:\n\n${notesText}`;
  }
}

module.exports = { categorize, formatResults };
