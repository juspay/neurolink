#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { NeuroLink } from '../../dist/lib/neurolink.js';

console.log('🧪 QUICK EVALUATION TEST');
const sdk = new NeuroLink();

try {
  const result = await sdk.generate({
    input: { text: 'Explain AI in one sentence' },
    provider: 'google-ai',
    enableEvaluation: true,
    maxTokens: 100
  });

  console.log('✅ AI Response:', result.text || result.content);

  if (result.evaluation) {
    console.log('🎯 EVALUATION RESULTS:');
    console.log('- Relevance:', result.evaluation.relevanceScore + '/10');
    console.log('- Accuracy:', result.evaluation.accuracyScore + '/10');
    console.log('- Completeness:', result.evaluation.completenessScore + '/10');
    console.log('- Overall:', result.evaluation.overall + '/10');
    console.log('- Time:', result.evaluation.evaluationTime + 'ms');
    console.log('\n🔍 FULL EVALUATION OBJECT:');
    console.log(JSON.stringify(result.evaluation, null, 2));
  } else {
    console.log('❌ No evaluation data');
  }

} catch (error) {
  console.error('❌ Test failed:', error.message);
}
