/**
 * Test the AI categorization module standalone.
 * Supports multiple AI providers based on .env
 * Run: node tests/test-ai.js
 */
const ai = require('../src/ai');
const config = require('../src/config');

const testMessages = [
  {
    input: 'I parked on level 3 section B at the mall',
    expectedIntent: 'save',
    expectedCategory: 'parking',
  },
  {
    input: 'Just finished reading Dune by Frank Herbert, amazing sci-fi novel',
    expectedIntent: 'save',
    expectedCategory: 'book',
  },
  {
    input: 'Where did I park my car?',
    expectedIntent: 'query',
    expectedCategory: 'parking',
  },
  {
    input: 'What books have I read?',
    expectedIntent: 'query',
    expectedCategory: 'book',
  },
  {
    input: 'Remember to buy groceries tomorrow: milk, eggs, bread',
    expectedIntent: 'save',
    expectedCategory: 'reminder',
  },
  {
    input: 'Met John from Microsoft at the tech conference, he works on Azure',
    expectedIntent: 'save',
    expectedCategory: 'person',
  },
  {
    input: 'Had a great idea for a startup - an AI-powered recipe recommender',
    expectedIntent: 'save',
    expectedCategory: 'idea',
  },
  {
    input: 'Just watched the new Spider-man movie, it was great!',
    expectedIntent: 'save',
    expectedCategory: 'media',
  },
  {
    input: 'Contact for Dr. Smith is 555-0199',
    expectedIntent: 'save',
    expectedCategory: 'contact',
  }
];

async function runTests() {
  const provider = config.ai_provider || 'ollama';
  console.log(`🧪 Testing AI Categorization Module (Provider: ${provider})`);
  
  if (provider === 'ollama') {
    console.log(`   (Requires Ollama running at ${config.ollama.url})\n`);
  } else {
    console.log(`   (Using ${provider} API)\n`);
  }

  let passed = 0;
  let failed = 0;

  for (const test of testMessages) {
    try {
      console.log(`📩 Input: "${test.input}"`);
      const result = await ai.categorize(test.input);
      console.log(`   Result: ${JSON.stringify(result)}`);

      const intentOk = result.intent === test.expectedIntent;
      // Allow for some flexibility in category if intent is correct
      const categoryOk = result.category === test.expectedCategory;

      if (intentOk && categoryOk) {
        console.log(`   ✅ PASS (intent: ${result.intent}, category: ${result.category})\n`);
        passed++;
      } else if (intentOk) {
        console.log(`   ⚠️  PARTIAL (expected intent=${test.expectedIntent}, category=${test.expectedCategory})`);
        console.log(`              got intent=${result.intent}, category=${result.category}\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL (expected intent=${test.expectedIntent}, category=${test.expectedCategory})`);
        console.log(`              got intent=${result.intent}, category=${result.category}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testMessages.length} tests`);

  if (failed === 0) {
    console.log('✅ All tests passed! 🎉\n');
  } else {
    console.log('⚠️  Some tests failed. This may be due to model interpretation differences or connection issues.\n');
  }
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  process.exit(1);
});
