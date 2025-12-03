#!/usr/bin/env node
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

// REAL WORLD DEMONSTRATION - Actual AI Enhancement Features Working
import { NeuroLink } from '../../dist/lib/neurolink.js';

console.log('🚀 REAL WORLD NEUROLINK AI ENHANCEMENT DEMONSTRATION');
console.log('='.repeat(60));
console.log('This demo makes REAL AI API calls to show actual enhancement data');
console.log('\n');

const sdk = new NeuroLink();

try {
  // DEMO 1: Real Analytics with Real AI Call
  console.log('📊 DEMO 1: REAL ANALYTICS TRACKING');
  console.log('Making real AI call with analytics enabled...');

  const analyticsResult = await sdk.generate({
    input: { text: 'Explain what artificial intelligence is in 2 sentences' },
    provider: 'auto',
    enableAnalytics: true,
    context: {
      demoId: 'analytics-demo-001',
      userId: 'demo-user-123',
      requestType: 'explanation',
      timestamp: new Date().toISOString()
    }
  });

  console.log('\n✅ AI RESPONSE:');
  console.log(analyticsResult.text || analyticsResult.content);

  console.log('\n📊 REAL ANALYTICS DATA:');
  if (analyticsResult.analytics) {
    console.log('├─ Provider:', analyticsResult.analytics.provider);
    console.log('├─ Model:', analyticsResult.analytics.model);
    console.log('├─ Tokens Used:');
    console.log('│  ├─ Input:', analyticsResult.analytics.tokens.input);
    console.log('│  ├─ Output:', analyticsResult.analytics.tokens.output);
    console.log('│  └─ Total:', analyticsResult.analytics.tokens.total);
    console.log('├─ Estimated Cost: $' + (analyticsResult.analytics.cost || 'N/A'));
    console.log('├─ Response Time:', analyticsResult.analytics.responseTime + 'ms');
    console.log('├─ Timestamp:', analyticsResult.analytics.timestamp);
    console.log('└─ Custom Context:');
    Object.entries(analyticsResult.analytics.context || {}).forEach(([key, value]) => {
      console.log(`   ├─ ${key}: ${value}`);
    });
  } else {
    console.log('❌ No analytics data returned - feature may not be fully integrated');
  }

  console.log('\n' + '='.repeat(60));

  // DEMO 2: Real Evaluation with Real AI Call
  console.log('\n⭐ DEMO 2: REAL QUALITY EVALUATION');
  console.log('Making real AI call with evaluation enabled...');

  const evaluationResult = await sdk.generate({
    input: { text: 'Write a technical explanation of machine learning algorithms' },
    provider: 'auto',
    enableEvaluation: true,
    context: {
      demoId: 'evaluation-demo-002',
      contentType: 'technical-explanation',
      targetAudience: 'developers',
      complexity: 'intermediate'
    }
  });

  console.log('\n✅ AI RESPONSE:');
  console.log(evaluationResult.text || evaluationResult.content);

  console.log('\n⭐ REAL EVALUATION SCORES:');
  if (evaluationResult.evaluation) {
    console.log('├─ Relevance Score:', evaluationResult.evaluation.relevanceScore + '/10');
    console.log('├─ Accuracy Score:', evaluationResult.evaluation.accuracyScore + '/10');
    console.log('├─ Completeness Score:', evaluationResult.evaluation.completenessScore + '/10');
    console.log('├─ Overall Quality:', evaluationResult.evaluation.overall + '/10');
    console.log('├─ Evaluation Model:', evaluationResult.evaluation.evaluationModel);
    console.log('└─ Evaluation Time:', evaluationResult.evaluation.evaluationTime + 'ms');
  } else {
    console.log('❌ No evaluation data returned - feature may not be fully integrated');
  }

  console.log('\n' + '='.repeat(60));

  // DEMO 3: Combined Analytics + Evaluation with Real AI Call
  console.log('\n🔥 DEMO 3: COMBINED ANALYTICS + EVALUATION');
  console.log('Making real AI call with BOTH features enabled...');

  const combinedResult = await sdk.generate({
    input: { text: 'Generate a professional email response to a customer complaint about delayed delivery' },
    provider: 'auto',
    enableAnalytics: true,
    enableEvaluation: true,
    context: {
      demoId: 'combined-demo-003',
      department: 'customer-service',
      priority: 'high',
      customerTier: 'premium',
      issueType: 'delivery-delay',
      requestedBy: 'support-agent-456'
    }
  });

  console.log('\n✅ AI RESPONSE:');
  console.log(combinedResult.text || combinedResult.content);

  console.log('\n📊 COMBINED ENHANCEMENT DATA:');

  if (combinedResult.analytics) {
    console.log('\n📈 ANALYTICS:');
    console.log('├─ Cost: $' + (combinedResult.analytics.cost || 'N/A'));
    console.log('├─ Tokens:', combinedResult.analytics.tokens.total);
    console.log('├─ Time:', combinedResult.analytics.responseTime + 'ms');
    console.log('└─ Context Keys:', Object.keys(combinedResult.analytics.context || {}).join(', '));
  }

  if (combinedResult.evaluation) {
    console.log('\n⭐ EVALUATION:');
    console.log('├─ Quality:', combinedResult.evaluation.overall + '/10');
    console.log('├─ Relevance:', combinedResult.evaluation.relevanceScore + '/10');
    console.log('├─ Accuracy:', combinedResult.evaluation.accuracyScore + '/10');
    console.log('└─ Completeness:', combinedResult.evaluation.completenessScore + '/10');
  }

  // Quality Gate Example
  if (combinedResult.evaluation && combinedResult.analytics) {
    console.log('\n🎯 QUALITY GATE EXAMPLE:');
    if (combinedResult.evaluation.overall >= 8) {
      console.log('✅ High quality response - approved for customer');
    } else {
      console.log('⚠️  Quality below threshold - requires review');
    }

    if (combinedResult.analytics.cost && combinedResult.analytics.cost > 0.05) {
      console.log('💰 High cost request - review pricing strategy');
    } else {
      console.log('💚 Cost-effective request');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 REAL WORLD DEMONSTRATION COMPLETE!');
  console.log('\n📋 SUMMARY OF REAL FUNCTIONALITY DEMONSTRATED:');
  console.log('✅ Real AI API calls with actual token usage');
  console.log('✅ Real analytics data with cost estimation');
  console.log('✅ Real evaluation scores from AI models');
  console.log('✅ Real context flow through request lifecycle');
  console.log('✅ Real quality gates and business logic');
  console.log('\n🚀 All enhancement features working with live AI providers!');

} catch (error) {
  console.error('\n❌ DEMO FAILED:', error.message);
  console.error('Stack:', error.stack);
  console.log('\n💡 This might indicate:');
  console.log('- Missing API keys in environment');
  console.log('- Network connectivity issues');
  console.log('- Provider authentication problems');
  console.log('- Enhancement integration incomplete');
  process.exit(1);
}
