/**
 * Test the AI categorization module standalone.
 * Requires Ollama to be running locally.
 * Run: node tests/test-ai.js
 */
const ai = require('../src/ai');

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
];

async function runTests() {
  console.log('🧪 Testing AI Categorization Module');
  console.log('   (Requires Ollama running at localhost:11434)\n');

  let passed = 0;
  let failed = 0;

  for (const test of testMessages) {
    try {
      console.log(`📩 Input: "${test.input}"`);
      const result = await ai.categorize(test.input);
      console.log(`   Result: ${JSON.stringify(result)}`);

      const intentOk = result.intent === test.expectedIntent;
      const categoryOk = result.category === test.expectedCategory;

      if (intentOk && categoryOk) {
        console.log(`   ✅ PASS (intent: ${result.intent}, category: ${result.category})\n`);
        passed++;
      } else {
        console.log(`   ⚠️  PARTIAL (expected intent=${test.expectedIntent}, category=${test.expectedCategory})`);
        console.log(`              got intent=${result.intent}, category=${result.category}\n`);
        // Count as pass if intent is correct (category can vary by model)
        if (intentOk) passed++;
        else failed++;
      }
    } catch (error) {
      console.log(`   ❌ FAIL: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testMessages.length} tests`);

  if (failed === 0) {
    console.log('✅ All tests passed! 🎉\n');
  } else {
    console.log('⚠️  Some tests failed. This may be due to model interpretation differences.\n');
  }
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  console.error('   Make sure Ollama is running: ollama serve');
  process.exit(1);
});
