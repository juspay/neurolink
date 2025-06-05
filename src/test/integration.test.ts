/**
 * Integration Tests for NeuroLink AI Providers
 * Tests real API integration with live credentials
 * WARNING: These tests consume actual API tokens/credits
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createBestAIProvider, AIProviderFactory, type AIProvider } from '../lib/index.js';

// Integration test configuration
const INTEGRATION_TIMEOUT = 30000; // 30 seconds for real API calls
const INTEGRATION_ENABLED = process.env.NEUROLINK_INTEGRATION_TESTS === 'true';

// Test prompts for different scenarios
const TEST_PROMPTS = {
  simple: 'Write a haiku about programming',
  complex: 'Explain the concept of machine learning in simple terms, including examples',
  creative: 'Write a short story about a robot learning to paint',
  technical: 'Describe the differences between REST and GraphQL APIs',
  structured: 'Generate a JSON object representing a user profile with name, age, and hobbies'
};

describe('NeuroLink Integration Tests', () => {
  let providers: Record<string, AIProvider>;

  beforeAll(async () => {
    if (!INTEGRATION_ENABLED) {
      console.log('🚨 Integration tests skipped. Set NEUROLINK_INTEGRATION_TESTS=true to enable.');
      return;
    }

    // Initialize all available providers
    providers = {};
    try {
      providers.openai = AIProviderFactory.createProvider('openai');
      console.log('✅ OpenAI provider initialized');
    } catch (e) {
      console.log('❌ OpenAI provider failed:', (e as Error).message);
    }

    try {
      providers.bedrock = AIProviderFactory.createProvider('bedrock');
      console.log('✅ Bedrock provider initialized');
    } catch (e) {
      console.log('❌ Bedrock provider failed:', (e as Error).message);
    }

    try {
      providers.vertex = AIProviderFactory.createProvider('vertex');
      console.log('✅ Vertex AI provider initialized');
    } catch (e) {
      console.log('❌ Vertex AI provider failed:', (e as Error).message);
    }
  });

  describe('Real API Integration Tests', () => {
    it.skipIf(!INTEGRATION_ENABLED)('should generate text with all available providers', async () => {
      const results: Record<string, any> = {};

      for (const [name, provider] of Object.entries(providers)) {
        const startTime = Date.now();
        try {
          const result = await provider.generateText({
            prompt: TEST_PROMPTS.simple,
            maxTokens: 100,
            temperature: 0.7
          });

          const responseTime = Date.now() - startTime;
          results[name] = {
            success: true,
            responseTime,
            contentLength: result.text.length,
            usage: result.usage,
            preview: result.text.substring(0, 50) + '...'
          };

          expect(result.text).toBeTruthy();
          expect(result.text.length).toBeGreaterThan(10);
          expect(responseTime).toBeLessThan(30000); // 30 second timeout

          console.log(`✅ ${name}: ${responseTime}ms, ${result.text.length} chars`);
        } catch (error) {
          results[name] = {
            success: false,
            error: (error as Error).message,
            responseTime: Date.now() - startTime
          };
          console.log(`❌ ${name}: ${(error as Error).message}`);
        }
      }

      // At least one provider should work
      const successfulProviders = Object.values(results).filter(r => r.success);
      expect(successfulProviders.length).toBeGreaterThan(0);

      console.log('📊 Integration Test Results:', JSON.stringify(results, null, 2));
    }, INTEGRATION_TIMEOUT);

    it.skipIf(!INTEGRATION_ENABLED)('should handle streaming with real APIs', async () => {
      const provider = createBestAIProvider();
      const startTime = Date.now();

      try {
        const result = await provider.streamText({
          prompt: TEST_PROMPTS.creative,
          maxTokens: 200,
          temperature: 0.8
        });

        let chunks = 0;
        let totalContent = '';

        for await (const chunk of result.textStream) {
          chunks++;
          totalContent += chunk;

          if (chunks > 100) break; // Safety valve
        }

        const responseTime = Date.now() - startTime;

        expect(chunks).toBeGreaterThan(0);
        expect(totalContent.length).toBeGreaterThan(20);
        expect(responseTime).toBeLessThan(30000);

        console.log(`✅ Streaming: ${chunks} chunks, ${totalContent.length} chars, ${responseTime}ms`);
      } catch (error) {
        console.log(`❌ Streaming failed: ${(error as Error).message}`);
        throw error;
      }
    }, INTEGRATION_TIMEOUT);

    it.skipIf(!INTEGRATION_ENABLED)('should handle auto provider selection under load', async () => {
      const concurrentRequests = 3;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const provider = createBestAIProvider();
        promises.push(
          provider.generateText({
            prompt: `${TEST_PROMPTS.technical} (Request ${i + 1})`,
            maxTokens: 150,
            temperature: 0.5
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(60000); // 60 second total timeout

      console.log(`✅ Concurrent tests: ${successful} success, ${failed} failed, ${totalTime}ms total`);
    }, 60000);

    it.skipIf(!INTEGRATION_ENABLED)('should handle different prompt types and lengths', async () => {
      const provider = createBestAIProvider();
      const testCases = [
        { name: 'simple', prompt: TEST_PROMPTS.simple, expectedMinLength: 20 },
        { name: 'complex', prompt: TEST_PROMPTS.complex, expectedMinLength: 100 },
        { name: 'creative', prompt: TEST_PROMPTS.creative, expectedMinLength: 50 },
        { name: 'structured', prompt: TEST_PROMPTS.structured, expectedMinLength: 30 }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();
        try {
          const result = await provider.generateText({
            prompt: testCase.prompt,
            maxTokens: 300,
            temperature: 0.7
          });

          const responseTime = Date.now() - startTime;

          expect(result.text.length).toBeGreaterThan(testCase.expectedMinLength);
          expect(responseTime).toBeLessThan(20000);

          console.log(`✅ ${testCase.name}: ${result.text.length} chars, ${responseTime}ms`);
        } catch (error) {
          console.log(`❌ ${testCase.name}: ${(error as Error).message}`);
          throw error;
        }
      }
    }, INTEGRATION_TIMEOUT * 4);
  });

  describe('Error Recovery and Resilience Tests', () => {
    it.skipIf(!INTEGRATION_ENABLED)('should handle rate limiting gracefully', async () => {
      const provider = createBestAIProvider();
      const rapidRequests = 5;
      const results = [];

      for (let i = 0; i < rapidRequests; i++) {
        try {
          const result = await provider.generateText({
            prompt: `Quick test ${i + 1}`,
            maxTokens: 50,
            temperature: 0.3
          });
          results.push({ success: true, length: result.text.length });
        } catch (error) {
          const errorMessage = (error as Error).message;
          results.push({ success: false, error: errorMessage });

          // If we hit rate limiting, that's expected behavior
          if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
            console.log(`✅ Rate limiting detected and handled: ${errorMessage}`);
          }
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // At least some requests should succeed
      const successful = results.filter(r => r.success).length;
      expect(successful).toBeGreaterThan(0);

      console.log(`📊 Rate limiting test: ${successful}/${rapidRequests} successful`);
    }, INTEGRATION_TIMEOUT * 2);

    it.skipIf(!INTEGRATION_ENABLED)('should recover from network issues', async () => {
      const provider = createBestAIProvider();
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const result = await provider.generateText({
            prompt: 'Network resilience test',
            maxTokens: 100,
            temperature: 0.5
          });

          expect(result.text).toBeTruthy();
          console.log(`✅ Network recovery successful on attempt ${retryCount + 1}`);
          break;
        } catch (error) {
          retryCount++;
          const errorMessage = (error as Error).message;
          console.log(`❌ Attempt ${retryCount} failed: ${errorMessage}`);

          if (retryCount === maxRetries) {
            throw new Error(`All ${maxRetries} attempts failed. Last error: ${errorMessage}`);
          }

          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }, INTEGRATION_TIMEOUT);
  });

  describe('Performance Benchmarks', () => {
    it.skipIf(!INTEGRATION_ENABLED)('should measure and compare provider performance', async () => {
      const benchmarkPrompt = 'Explain artificial intelligence in 2-3 sentences';
      const benchmarks: Record<string, any> = {};

      for (const [name, provider] of Object.entries(providers)) {
        const runs = 3;
        const times: number[] = [];
        const lengths: number[] = [];

        for (let i = 0; i < runs; i++) {
          try {
            const startTime = Date.now();
            const result = await provider.generateText({
              prompt: benchmarkPrompt,
              maxTokens: 100,
              temperature: 0.7
            });
            const responseTime = Date.now() - startTime;

            if (result && result.text) {
              times.push(responseTime);
              lengths.push(result.text.length);
            }

            // Small delay between runs
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.log(`❌ ${name} benchmark run ${i + 1} failed: ${(error as Error).message}`);
          }
        }

        if (times.length > 0) {
          benchmarks[name] = {
            avgResponseTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
            minResponseTime: Math.min(...times),
            maxResponseTime: Math.max(...times),
            avgContentLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
            successfulRuns: times.length,
            totalRuns: runs
          };
        }
      }

      console.log('📊 Performance Benchmarks:', JSON.stringify(benchmarks, null, 2));

      // Verify at least one provider has reasonable performance
      const validBenchmarks = Object.values(benchmarks).filter(b => b.avgResponseTime < 30000);
      expect(validBenchmarks.length).toBeGreaterThan(0);
    }, INTEGRATION_TIMEOUT * 3);
  });
});
