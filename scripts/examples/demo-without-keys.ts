#!/usr/bin/env tsx

/**
 * DEMO SCRIPT - No API Keys Required
 * Shows NeuroLink structure and expected behavior
 */

import dotenv from 'dotenv';
dotenv.config();

import { NeuroLink } from '../../dist/lib/neurolink.js';

// No SDK instance needed - this demo uses mock data only

console.log('🚀 NEUROLINK DEMO - No API Keys Required');
console.log('=' .repeat(50));
console.log('This demo shows the expected structure without making real API calls\n');

type MockAnalytics = {
  provider: string;
  model: string;
  tokens: { input: number; output: number; total: number };
  cost: number;
  responseTime: number;
  context: Record<string, string>;
};

type MockEvaluation = {
  relevance: number;
  accuracy: number;
  completeness: number;
  overall: number;
};

type MockResult = {
  text: string;
  analytics?: MockAnalytics;
  evaluation?: MockEvaluation;
};

// Mock demonstration of what analytics and evaluation would look like
function mockAnalytics(): MockAnalytics {
  return {
    provider: 'google-ai',
    model: 'gemini-2.5-pro',
    tokens: { input: 12, output: 45, total: 57 },
    cost: 0.00034,
    responseTime: 1850,
    context: { demo: 'mock-analytics' }
  };
}

function mockEvaluation(): MockEvaluation {
  return {
    relevance: 9,
    accuracy: 8,
    completeness: 9,
    overall: 8.7
  };
}

function mockResult(text: string, includeAnalytics = false, includeEvaluation = false): MockResult {
  const result: MockResult = { text };

  if (includeAnalytics) {
    result.analytics = mockAnalytics();
  }

  if (includeEvaluation) {
    result.evaluation = mockEvaluation();
  }

  return result;
}

// Demonstration
console.log('📝 Test 1: Basic Usage (Mock)');
const basicResult = mockResult('AI is artificial intelligence technology.');
console.log('✅ Response:', basicResult.text);
console.log('Analytics present:', !!basicResult.analytics);
console.log('Evaluation present:', !!basicResult.evaluation);

console.log('\n📝 Test 2: With Analytics (Mock)');
const analyticsResult = mockResult('2+2 equals 4.', true, false);
console.log('✅ Response:', analyticsResult.text);
console.log('📊 Analytics:', analyticsResult.analytics);

console.log('\n📝 Test 3: With Analytics + Evaluation (Mock)');
const fullResult = mockResult('3+3 equals 6.', true, true);
console.log('✅ Response:', fullResult.text);
console.log('📊 Analytics:', fullResult.analytics);
console.log('⭐ Evaluation:', fullResult.evaluation);

console.log('\n🎯 EXPECTED API USAGE:');
console.log('```javascript');
console.log('const result = await sdk.generate({');
console.log('  input: { text: "What is AI?" },');
console.log('  enableAnalytics: true,');
console.log('  enableEvaluation: true,');
console.log('  context: { demo: "test" }');
console.log('});');
console.log('```');

console.log('\n📋 SETUP INSTRUCTIONS:');
console.log('To use with real API:');
console.log('1. Set GOOGLE_AI_API_KEY in .env file');
console.log('2. Or set OPENAI_API_KEY for OpenAI');
console.log('3. Run: node scripts/examples/simple-test.js');

console.log('\n✅ Demo completed successfully!');
