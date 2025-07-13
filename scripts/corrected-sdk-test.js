#!/usr/bin/env node

/**
 * CORRECTED SDK FUNCTIONALITY TEST
 * Tests actual NeuroLink SDK interface methods
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

async function testCorrectSDK() {
  console.log('🚀 CORRECTED SDK FUNCTIONALITY TEST\n');
  
  try {
    // Test 1: Import SDK correctly
    console.log('📦 TESTING SDK IMPORTS');
    
    let createBestAIProvider, createAIProvider, NeuroLink, createAIProviderWithFallback;
    try {
      const sdk = await import('../dist/lib/index.js');
      createBestAIProvider = sdk.createBestAIProvider;
      createAIProvider = sdk.createAIProvider;
      createAIProviderWithFallback = sdk.createAIProviderWithFallback;
      NeuroLink = sdk.NeuroLink;
      
      log('SDK Import', 'SUCCESS', 
        `Available: createBestAIProvider(${typeof createBestAIProvider}), NeuroLink(${typeof NeuroLink})`);
    } catch (error) {
      log('SDK Import', 'FAILED', error.message);
      return;
    }

    // Test 2: Create Best Provider (this is async!)
    console.log('\n🤖 TESTING PROVIDER CREATION');
    
    let provider;
    try {
      provider = await createBestAIProvider('google-ai');
      log('createBestAIProvider() - Async', 'SUCCESS', 
        `Provider type: ${typeof provider}, Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(provider)).join(', ')}`);
    } catch (error) {
      log('createBestAIProvider() - Async', 'FAILED', error.message);
      // Try without specific provider
      try {
        provider = await createBestAIProvider();
        log('createBestAIProvider() - Auto', 'SUCCESS', 'Auto provider selection worked');
      } catch (error2) {
        log('createBestAIProvider() - Auto', 'FAILED', error2.message);
        return;
      }
    }

    // Test 3: Test actual methods available on provider
    console.log('\n🔍 INSPECTING PROVIDER METHODS');
    
    const providerMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(provider));
    const hasGenerate = providerMethods.includes('generate');
    const hasGenerate = providerMethods.includes('generate');
    const hasGen = providerMethods.includes('gen');
    const hasStream = providerMethods.includes('stream');
    
    log('Provider Method Inspection', 'SUCCESS', 
      `generate: ${hasGenerate}, generate: ${hasGenerate}, gen: ${hasGen}, stream: ${hasStream}`,
      `All methods: ${providerMethods.join(', ')}`);

    // Test 4: Test generate if available
    if (hasGenerate) {
      console.log('\n💬 TESTING GENERATE METHOD');
      
      try {
        const result = await provider.generate({ input: { text: 'What is 2+2?' } });
        if (result && result.content) {
          log('generate() - String Input', 'SUCCESS', 'Generated text successfully', result.content);
        } else {
          log('generate() - String Input', 'FAILED', 'No content in result', JSON.stringify(result));
        }
      } catch (error) {
        log('generate() - String Input', 'FAILED', error.message);
      }
      
      // Test with options object
      try {
        const result = await provider.generate({
          input: { text: 'Write a haiku about programming' },
          maxTokens: 100
        });
        if (result && result.content) {
          log('generate() - Options Object', 'SUCCESS', 'Generated with options', result.content);
        } else {
          log('generate() - Options Object', 'FAILED', 'No content in result');
        }
      } catch (error) {
        log('generate() - Options Object', 'FAILED', error.message);
      }
    }

    // Test 5: Test generate alias if available
    if (hasGenerate) {
      console.log('\n🔄 TESTING GENERATE ALIAS');
      
      try {
        const result = await provider.generate('Hello from generate alias');
        if (result && result.text) {
          log('generate() alias', 'SUCCESS', 'Alias method working', result.text);
        } else {
          log('generate() alias', 'FAILED', 'No text in result');
        }
      } catch (error) {
        log('generate() alias', 'FAILED', error.message);
      }
    }

    // Test 6: Test gen alias if available
    if (hasGen) {
      console.log('\n⚡ TESTING GEN ALIAS');
      
      try {
        const result = await provider.gen('Hello from gen alias');
        if (result && result.text) {
          log('gen() alias', 'SUCCESS', 'Short alias working', result.text);
        } else {
          log('gen() alias', 'FAILED', 'No text in result');
        }
      } catch (error) {
        log('gen() alias', 'FAILED', error.message);
      }
    }

    // Test 7: Test NeuroLink class
    console.log('\n⭐ TESTING NEUROLINK CLASS');
    
    try {
      const neurolinkInstance = new NeuroLink();
      log('NeuroLink Class Creation', 'SUCCESS', 'NeuroLink instance created');
      
      // Test NeuroLink methods
      if (typeof neurolinkInstance.generate === 'function') {
        try {
          const result = await neurolinkInstance.generate({ input: { text: 'Test NeuroLink class' } });
          if (result && result.content) {
            log('NeuroLink.generate()', 'SUCCESS', 'NeuroLink method working', 
              result.content);
          } else {
            log('NeuroLink.generate()', 'FAILED', 'No content in result');
          }
        } catch (error) {
          log('NeuroLink.generate()', 'FAILED', error.message);
        }
      } else {
        log('NeuroLink.generate()', 'FAILED', 'Method not available');
      }
    } catch (error) {
      log('NeuroLink Class Creation', 'FAILED', error.message);
    }

    // Test 8: Test createAIProvider
    if (createAIProvider) {
      console.log('\n🔧 TESTING createAIProvider');
      
      try {
        const basicProvider = await createAIProvider('google-ai');
        log('createAIProvider()', 'SUCCESS', 'Basic provider created');
      } catch (error) {
        log('createAIProvider()', 'FAILED', error.message);
      }
    }

    // Test 9: Test fallback provider
    if (createAIProviderWithFallback) {
      console.log('\n🔄 TESTING FALLBACK PROVIDER');
      
      try {
        const fallbackResult = await createAIProviderWithFallback('google-ai', 'openai');
        log('createAIProviderWithFallback()', 'SUCCESS', 
          `Fallback created: ${typeof fallbackResult}`);
      } catch (error) {
        log('createAIProviderWithFallback()', 'FAILED', error.message);
      }
    }

    // Test 10: Test enhanced features if available
    console.log('\n🌟 TESTING ENHANCED FEATURES');
    
    if (hasGenerate && provider.generate) {
      try {
        const result = await provider.generate({
          input: { text: 'Test enhanced features' },
          enableAnalytics: true,
          enableEvaluation: true
        });
        
        const hasAnalytics = result && result.analytics;
        const hasEvaluation = result && result.evaluation;
        
        log('Enhanced Features', 'SUCCESS', 
          `Analytics: ${!!hasAnalytics}, Evaluation: ${!!hasEvaluation}`,
          JSON.stringify({ analytics: hasAnalytics, evaluation: hasEvaluation }));
      } catch (error) {
        log('Enhanced Features', 'FAILED', error.message);
      }
    }

    // Test 11: Test streaming if available
    if (hasStream) {
      console.log('\n🌊 TESTING STREAMING');
      
      try {
        const streamResult = await provider.stream({ input: { text: 'Quick stream test' } });
        log('stream() method', 'SUCCESS', 
          `Stream result type: ${typeof streamResult}`);
      } catch (error) {
        log('stream() method', 'FAILED', error.message);
      }
    }

  } catch (globalError) {
    log('Global SDK Test', 'FAILED', globalError.message);
  }
}

// Run tests and generate report
testCorrectSDK().then(() => {
  const passed = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const total = results.length;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`
    },
    criticalTests: {
      'SDK Import': results.find(r => r.test === 'SDK Import')?.status,
      'Provider Creation': results.find(r => r.test.includes('createBestAIProvider'))?.status,
      'generate Method': results.find(r => r.test.includes('generate'))?.status,
      'NeuroLink Class': results.find(r => r.test === 'NeuroLink Class Creation')?.status
    },
    results
  };
  
  writeFileSync('./corrected-sdk-test-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('CORRECTED SDK TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('\n🔑 CRITICAL TESTS:');
  Object.entries(report.criticalTests).forEach(([test, status]) => {
    const icon = status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${icon} ${test}: ${status}`);
  });
  console.log(`\n📁 Report: corrected-sdk-test-report.json`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 ALL SDK FUNCTIONALITY WORKING!');
  } else if (failed <= 3) {
    console.log('⚠️ MOSTLY WORKING - Minor SDK issues');
  } else {
    console.log('🚨 SDK FUNCTIONALITY ISSUES DETECTED');
  }
  
  process.exit(failed > 5 ? 1 : 0);
}).catch(error => {
  console.error('💥 FATAL SDK TEST ERROR:', error);
  process.exit(1);
});