/**
 * Test file to verify the NeuroLink AI toolkit is working correctly
 */

import {
  createAIProvider,
  createBestAIProvider,
  createAIProviderWithFallback,
  AIProviderFactory,
  VERSION
} from './lib/index.js';

async function testNeuroLink() {
  console.log(`🚀 Testing NeuroLink AI Toolkit v${VERSION}`);

  try {
    // Test 1: Create OpenAI provider (if configured)
    console.log('\n1️⃣ Testing OpenAI provider creation...');
    const openaiProvider = createAIProvider('openai');
    console.log('✅ OpenAI provider created successfully');

    // Test 2: Create best available provider
    console.log('\n2️⃣ Testing best provider selection...');
    const bestProvider = createBestAIProvider();
    console.log('✅ Best provider created successfully');

    // Test 3: Create provider with fallback
    console.log('\n3️⃣ Testing provider with fallback...');
    const { primary, fallback } = createAIProviderWithFallback('bedrock', 'openai');
    console.log('✅ Primary and fallback providers created successfully');

    // Test 4: Direct factory usage
    console.log('\n4️⃣ Testing direct factory usage...');
    const factoryProvider = AIProviderFactory.createProvider('vertex');
    console.log('✅ Factory provider created successfully');

    console.log('\n🎉 All tests passed! NeuroLink is ready to use.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNeuroLink();
}

export { testNeuroLink };
