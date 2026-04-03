# 🧠 LocalLLM Integration: Future TODO

This document outlines the roadmap for transitioning SaveNote from a keyword-based engine to a full **Local Large Language Model (LLM)** using **Ollama**.

## Current Architecture (Regex/Keyword)
- **Strengths:** Fast, zero-latency, zero-dependencies.
- **Weaknesses:** Fragile to nuance (e.g., "I need to find my car" vs "I parked my car"), unable to summarize, limited to predefined categories.

## Proposed Architecture (Ollama)

### 1. The Bridge (Local Server)
Ollama runs as a local service on port `11434`. To allow the Browser Extension or Bookmarklet to communicate with it, we need to bypass CORS or use a small Node.js proxy (which we already have in `src/index.js`).

### 2. Intelligent Categorization
Replace the `categorize()` function with a prompt-based call:
```javascript
// Example Prompt
const prompt = `
  Classify the following WhatsApp message into one of these categories: 
  [parking, book, idea, reminder, shopping, location, person, recipe, health, finance].
  Message: "${text}"
  Respond only with the category name.
`;
```

### 3. Entity Extraction
Instead of simple regex, use the LLM to extract structured metadata:
- **Input:** "I parked on level 3 section B at the airport"
- **LLM Output (JSON):** `{"level": 3, "section": "B", "location": "airport"}`

### 4. Semantic Search (The Retrieval Engine)
Instead of keyword matching, move to **Vector Embeddings**:
1. When a note is saved, send the text to Ollama's `/api/embeddings` endpoint.
2. Store the resulting vector in the local database.
3. When searching ("Where is my car?"), convert the query to a vector.
4. Use **Cosine Similarity** to find the most relevant note, even if the keywords don't match (e.g., "Where is my vehicle?").

## Implementation Steps

- [ ] **Ollama Connectivity:** Implement a check in the Dashboard to see if Ollama is running.
- [ ] **Model Selection:** Use `llama3` or `mistral` for high-quality extraction, or `tiny-llama` for speed on lower-end hardware.
- [ ] **Async Processing:** Update the `handleInput` function to show a "Bot is thinking..." state while the local LLM generates a response.
- [ ] **Summarization Feature:** Add a "Summarize" button to long notes in the dashboard.

## Privacy Note
By using Ollama, SaveNote maintains its core promise: **Your data never leaves your machine.** The LLM runs 100% locally.
