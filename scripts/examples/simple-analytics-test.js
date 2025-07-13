#!/usr/bin/env node

/**
 * Simple Analytics Test: Just NeuroLink class
 */

import dotenv from 'dotenv';
dotenv.config();

import { NeuroLink } from '../../dist/index.js';

async function testSimpleAnalytics() {
  console.log('🔍 Testing NeuroLink Analytics and Evaluation...');

  try {
    const neurolink = new NeuroLink();

    console.log('\n📝 Test 1: Basic generation WITHOUT analytics/evaluation');
    const basicResult = await neurolink.generate({
      input: { text: 'What is 2+2?' }
    });

    console.log('✅ Basic Response:', basicResult.content || basicResult.text);
    console.log('Analytics present:', !!basicResult.analytics);
    console.log('Evaluation present:', !!basicResult.evaluation);

    console.log('\n📝 Test 2: Generation WITH analytics and evaluation');
    const enhancedResult = await neurolink.generate({
      input: { text: 'What is 3+3?' },
      enableAnalytics: true,
      enableEvaluation: true,
      context: { test: 'enhanced-mode' }
    });

    console.log('✅ Enhanced Response:', enhancedResult.content || enhancedResult.text);
    console.log('\n📊 Analytics Check:');
    if (enhancedResult.analytics) {
      console.log('✅ Analytics: WORKING');
      console.log('  Provider:', enhancedResult.analytics.provider);
      console.log('  Model:', enhancedResult.analytics.model);
      console.log('  Tokens:', enhancedResult.analytics.tokens);
      console.log('  Cost:', enhancedResult.analytics.cost);
      console.log('  Response Time:', enhancedResult.analytics.responseTime, 'ms');
      console.log('  Context:', enhancedResult.analytics.context);
    } else {
      console.log('❌ Analytics: Not found in result');
    }

    console.log('\n⭐ Evaluation Check:');
    if (enhancedResult.evaluation) {
      console.log('✅ Evaluation: WORKING');
      console.log('  Relevance:', enhancedResult.evaluation.relevanceScore);
      console.log('  Accuracy:', enhancedResult.evaluation.accuracyScore);
      console.log('  Completeness:', enhancedResult.evaluation.completenessScore);
      console.log('  Overall:', enhancedResult.evaluation.overall);
      console.log('  Model Used:', enhancedResult.evaluation.evaluationModel);
      console.log('  Evaluation Time:', enhancedResult.evaluation.evaluationTime, 'ms');
      console.log('  Reasoning:', enhancedResult.evaluation.reasoning);
      console.log('  Alert Severity:', enhancedResult.evaluation.alertSeverity);
    } else {
      console.log('❌ Evaluation: Not found in result');
    }

    console.log('\n📋 Full Result Keys:', Object.keys(enhancedResult));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSimpleAnalytics().catch(console.error);
