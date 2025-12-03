#!/usr/bin/env node

/**
 * ROBUST SIMPLE TEST - Handles missing API keys gracefully
 */

import { NeuroLink } from '../../dist/lib/neurolink.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sdk = new NeuroLink();

console.log('🔍 ROBUST ENHANCEMENT TEST');

async function testWithFallback() {
  const providers = ['google-ai', 'openai', 'anthropic'];

  for (const provider of providers) {
    console.log(`\n🧪 Testing ${provider}...`);

    try {
      const result = await sdk.generate({
        input: { text: 'Test AI response' },
        provider: provider,
        enableAnalytics: true,
        enableEvaluation: true,
        context: { test: 'verification', provider },
        maxTokens: 10 // Keep it small for testing
      });

      console.log('✅ SUCCESS with', provider);
      console.log('Result Keys:', Object.keys(result));
      console.log('Analytics Present:', !!result.analytics);
      console.log('Evaluation Present:', !!result.evaluation);

      if (result.analytics) {
        console.log('📊 Analytics:');
        console.log('- Provider:', result.analytics.provider);
        console.log('- Model:', result.analytics.model);
        console.log('- Tokens:', result.analytics.tokens);
        console.log('- Response Time:', result.analytics.responseTime, 'ms');
      }

      if (result.evaluation) {
        console.log('⭐ Evaluation:');
        console.log('- Overall Score:', result.evaluation.overall);
        console.log('- Relevance:', result.evaluation.relevanceScore);
        console.log('- Accuracy:', result.evaluation.accuracyScore);
        console.log('- Completeness:', result.evaluation.completenessScore);
        console.log('- Reasoning:', result.evaluation.reasoning);
      }

      // Found working provider, exit
      return;

    } catch (error) {
      console.log('❌ Failed with', provider, ':', error.message.split('\n')[0]);
    }
  }

  console.log('\n⚠️  No working providers found. Please set API keys:');
  console.log('- GOOGLE_AI_API_KEY for Google AI Studio');
  console.log('- OPENAI_API_KEY for OpenAI');
  console.log('- ANTHROPIC_API_KEY for Anthropic Claude');
  console.log('\n📋 See demo-without-keys.js for mock demonstration');
}

testWithFallback();
