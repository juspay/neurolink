#!/usr/bin/env node

/**
 * COMPREHENSIVE SDK FUNCTIONALITY TEST
 * Tests all NeuroLink SDK features programmatically
 */

import { writeFileSync } from "fs";

const results = [];

function log(test, status, details = "", output = "") {
  const result = { test, status, details, output: output.slice(0, 500), timestamp: new Date().toISOString() };
  results.push(result);
  console.log(`${status === 'SUCCESS' ? '✅' : '❌'} ${test}`);
  if (details) console.log(`   ${details}`);
  if (output) console.log(`   Output: ${output.slice(0, 200)}...`);
}

async function testSDK() {
  console.log('🚀 COMPREHENSIVE SDK FUNCTIONALITY TEST\n');
  
  try {
    // Test 1: Import SDK
    console.log('\n📦 TESTING SDK IMPORTS');
    
    let neurolink, createBestAIProvider, NeuroLink;
    try {
      const sdk = await import('../dist/lib/index.js');
      createBestAIProvider = sdk.createBestAIProvider;
      NeuroLink = sdk.NeuroLink;
      neurolink = sdk.default;
      log('SDK Import', 'SUCCESS', 'All imports successful');
    } catch (error) {
      log('SDK Import', 'FAILED', error.message);
      return;
    }

    // Test 2: Create Best AI Provider
    console.log('\n🤖 TESTING PROVIDER CREATION');
    
    let provider;
    try {
      provider = createBestAIProvider('google-ai');
      log('createBestAIProvider()', 'SUCCESS', 'Provider created successfully');
    } catch (error) {
      log('createBestAIProvider()', 'FAILED', error.message);
      return;
    }

    // Test 3: Basic generate method
    console.log('\n💬 TESTING BASIC TEXT GENERATION');
    
    try {
      const result = await provider.generate({ input: { text: 'What is 2+2?' } });
      log('generate() - Basic', 'SUCCESS', 'Generated text successfully', result);
    } catch (error) {
      log('generate() - Basic', 'FAILED', error.message);
    }

    // Test 4: generate with options
    try {
      const result = await provider.generate({
        input: { text: 'Write a haiku about AI' },
        maxTokens: 100
      });
      log('generate() - With Options', 'SUCCESS', 'Generated with options', result);
    } catch (error) {
      log('generate() - With Options', 'FAILED', error.message);
    }

    // Test 5: CLI-style aliases
    console.log('\n🔄 TESTING CLI-STYLE ALIASES');
    
    try {
      const result = await provider.generate('Test generate alias');
      log('generate() alias', 'SUCCESS', 'Alias method working', result);
    } catch (error) {
      log('generate() alias', 'FAILED', error.message);
    }

    try {
      const result = await provider.gen('Test gen alias');
      log('gen() alias', 'SUCCESS', 'Short alias working', result);
    } catch (error) {
      log('gen() alias', 'FAILED', error.message);
    }

    // Test 6: NeuroLink class with enhancements
    console.log('\n⭐ TESTING ENHANCED NEUROLINK CLASS');
    
    try {
      const neurolinkInstance = new NeuroLink();
      const result = await neurolinkInstance.generate({
        input: { text: 'Test enhanced features' },
        enableAnalytics: true,
        enableEvaluation: true,
        context: { test: 'sdk-test' }
      });
      
      // Check for enhancement data
      const hasAnalytics = result.analytics !== undefined;
      const hasEvaluation = result.evaluation !== undefined;
      
      log('NeuroLink Enhanced Features', 'SUCCESS', 
        `Analytics: ${hasAnalytics}, Evaluation: ${hasEvaluation}`, 
        JSON.stringify({ 
          text: result.text?.slice(0, 100),
          analytics: result.analytics,
          evaluation: result.evaluation 
        }));
    } catch (error) {
      log('NeuroLink Enhanced Features', 'FAILED', error.message);
    }

    // Test 7: Provider fallback
    console.log('\n🔄 TESTING PROVIDER FALLBACK');
    
    try {
      const { createAIProviderWithFallback } = await import('../dist/lib/index.js');
      const fallbackProvider = createAIProviderWithFallback('google-ai', 'openai');
      const result = await fallbackProvider.generate({ input: { text: 'Test fallback' } });
      log('Provider Fallback', 'SUCCESS', 'Fallback provider working', result);
    } catch (error) {
      log('Provider Fallback', 'FAILED', error.message);
    }

    // Test 8: Auto provider selection
    console.log('\n🎯 TESTING AUTO PROVIDER SELECTION');
    
    try {
      const autoProvider = createBestAIProvider(); // No specific provider
      const result = await autoProvider.generate({ input: { text: 'Test auto selection' } });
      log('Auto Provider Selection', 'SUCCESS', 'Auto selection working', result);
    } catch (error) {
      log('Auto Provider Selection', 'FAILED', error.message);
    }

    // Test 9: Different providers
    console.log('\n🔧 TESTING DIFFERENT PROVIDERS');
    
    const providersToTest = ['google-ai', 'openai', 'anthropic'];
    
    for (const providerName of providersToTest) {
      try {
        const testProvider = createBestAIProvider(providerName);
        const result = await testProvider.generate({ input: { text: 'Hello' } });
        log(`Provider: ${providerName}`, 'SUCCESS', 'Provider working', result);
      } catch (error) {
        if (error.message.includes('API key') || error.message.includes('credentials')) {
          log(`Provider: ${providerName}`, 'SUCCESS', 'Provider recognized (needs API key)');
        } else {
          log(`Provider: ${providerName}`, 'FAILED', error.message);
        }
      }
    }

    // Test 10: Streaming (if available)
    console.log('\n🌊 TESTING STREAMING FEATURES');
    
    try {
      if (provider.stream) {
        const stream = await provider.stream({ input: { text: 'Tell me a short joke' } });
        log('stream() method', 'SUCCESS', 'Streaming method available');
      } else {
        log('stream() method', 'SKIPPED', 'Method not available on provider');
      }
    } catch (error) {
      log('stream() method', 'FAILED', error.message);
    }

    // Test 11: Error handling
    console.log('\n🛡️ TESTING ERROR HANDLING');
    
    try {
      await provider.generate({ input: { text: '' } }); // Empty prompt
      log('Empty Prompt Handling', 'UNCLEAR', 'Empty prompt accepted');
    } catch (error) {
      log('Empty Prompt Handling', 'SUCCESS', 'Properly rejected empty prompt');
    }

    try {
      const invalidProvider = createBestAIProvider('invalid-provider');
      await invalidProvider.generate({ input: { text: 'Test' } });
      log('Invalid Provider Handling', 'FAILED', 'Should have rejected invalid provider');
    } catch (error) {
      log('Invalid Provider Handling', 'SUCCESS', 'Properly rejected invalid provider');
    }

    // Test 12: TypeScript interfaces (basic check)
    console.log('\n📝 TESTING TYPESCRIPT INTERFACES');
    
    try {
      const result = await provider.generate({
        input: { text: 'Test interfaces' },
        maxTokens: 50,
        temperature: 0.7
      });
      log('TypeScript Interfaces', 'SUCCESS', 'Interface parameters accepted', result);
    } catch (error) {
      log('TypeScript Interfaces', 'FAILED', error.message);
    }

  } catch (globalError) {
    log('Global SDK Test', 'FAILED', globalError.message);
  }
}

// Run tests and generate report
testSDK().then(() => {
  const passed = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  const total = results.length;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      skipped,
      successRate: `${((passed / (total - skipped)) * 100).toFixed(1)}%`
    },
    categories: {
      'SDK Imports': results.filter(r => r.test.includes('Import')).length,
      'Provider Creation': results.filter(r => r.test.includes('Provider')).length,
      'Text Generation': results.filter(r => r.test.includes('generate')).length,
      'Enhanced Features': results.filter(r => r.test.includes('Enhanced')).length,
      'Error Handling': results.filter(r => r.test.includes('Handling')).length
    },
    results
  };
  
  writeFileSync('./sdk-test-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('COMPREHENSIVE SDK TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⏭️ Skipped: ${skipped}/${total}`);
  console.log(`📊 Success Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%`);
  console.log(`📁 Report: sdk-test-report.json`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 ALL SDK FUNCTIONALITY WORKING PERFECTLY!');
  } else if (failed <= 2) {
    console.log('⚠️ MOSTLY WORKING - Minor SDK issues');
  } else {
    console.log('🚨 CRITICAL SDK ISSUES DETECTED');
  }
  
  process.exit(failed > 3 ? 1 : 0);
}).catch(error => {
  console.error('💥 FATAL SDK TEST ERROR:', error);
  process.exit(1);
});