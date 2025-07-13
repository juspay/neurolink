#!/usr/bin/env node

import { NeuroLink } from '../../dist/lib/neurolink.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sdk = new NeuroLink();

console.log('🔍 SIMPLE ENHANCEMENT TEST');

async function test() {
  try {
    const result = await sdk.generate({
      input: { text: 'Test AI response' },
      provider: 'google-ai',
      enableAnalytics: true,
      enableEvaluation: true,
      context: { test: 'verification' }
    });

    console.log('\n✅ SUCCESS:');
    console.log('Result Keys:', Object.keys(result));
    console.log('Analytics Present:', !!result.analytics);
    console.log('Evaluation Present:', !!result.evaluation);

    if (result.analytics) {
      console.log('\nAnalytics Data:');
      console.log('- Provider:', result.analytics.provider);
      console.log('- Tokens:', result.analytics.tokens);
      console.log('- Context:', result.analytics.context);
    }

    if (result.evaluation) {
      console.log('\nEvaluation Data:');
      console.log('- Overall Score:', result.evaluation.overall);
      console.log('- Relevance:', result.evaluation.relevanceScore);
      console.log('- Accuracy:', result.evaluation.accuracyScore);
      console.log('- Completeness:', result.evaluation.completenessScore);
      console.log('- Reasoning:', result.evaluation.reasoning);
    }

  } catch (error) {
    console.log('\n❌ FAILED:', error.message);
  }
}

test();
