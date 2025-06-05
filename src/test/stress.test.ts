/**
 * Stress Tests for NeuroLink AI Providers
 * Tests system behavior under heavy load and edge conditions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createBestAIProvider, AIProviderFactory, type AIProvider } from '../lib/index.js';

// Stress test configuration
const STRESS_TIMEOUT = 120000; // 2 minutes for stress tests
const STRESS_ENABLED = process.env.NEUROLINK_STRESS_TESTS === 'true';

describe('NeuroLink Stress Tests', () => {
  let provider: AIProvider;

  beforeAll(async () => {
    if (!STRESS_ENABLED) {
      console.log('🚨 Stress tests skipped. Set NEUROLINK_STRESS_TESTS=true to enable.');
      return;
    }

    try {
      provider = createBestAIProvider();
      console.log('✅ Provider initialized for stress testing');
    } catch (error) {
      console.log('❌ Provider initialization failed:', (error as Error).message);
    }
  });

  describe('High Volume Text Generation', () => {
    it.skipIf(!STRESS_ENABLED)('should handle rapid sequential requests', async () => {
      const requestCount = 10;
      const results: any[] = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        try {
          const result = await provider.generateText({
            prompt: `Test request ${i + 1}: Write a brief sentence`,
            maxTokens: 50,
            temperature: 0.5
          });

          results.push({
            success: true,
            requestId: i + 1,
            responseTime: Date.now() - startTime,
            contentLength: result?.text?.length || 0
          });

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.push({
            success: false,
            requestId: i + 1,
            error: (error as Error).message,
            responseTime: Date.now() - startTime
          });
        }
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`📊 Rapid requests: ${successful.length} success, ${failed.length} failed`);

      // At least 70% should succeed under normal conditions
      expect(successful.length / requestCount).toBeGreaterThan(0.7);

      if (successful.length > 0) {
        const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
        console.log(`⏱️ Average response time: ${Math.round(avgResponseTime)}ms`);

        // Response times should be reasonable
        expect(avgResponseTime).toBeLessThan(30000);
      }
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle concurrent requests', async () => {
      const concurrentCount = 5;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentCount; i++) {
        promises.push(
          provider.generateText({
            prompt: `Concurrent test ${i + 1}: Generate a short response`,
            maxTokens: 50,
            temperature: 0.5
          }).then(result => ({
            success: true,
            requestId: i + 1,
            contentLength: result.text.length
          })).catch(error => ({
            success: false,
            requestId: i + 1,
            error: (error as Error).message
          }))
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - startTime;

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const successful = fulfilled.filter(r => r.value.success);

      console.log(`📊 Concurrent requests: ${successful.length}/${concurrentCount} successful in ${totalTime}ms`);

      // At least half should succeed
      expect(successful.length).toBeGreaterThan(concurrentCount / 2);

      // Total time should be reasonable for concurrent execution
      expect(totalTime).toBeLessThan(60000);
    }, STRESS_TIMEOUT);
  });

  describe('Large Input Handling', () => {
    it.skipIf(!STRESS_ENABLED)('should handle long prompts', async () => {
      const longPrompt = 'This is a test of long prompt handling. '.repeat(100); // ~4000 characters

      try {
        const result = await provider.generateText({
          prompt: longPrompt,
          maxTokens: 100,
          temperature: 0.5
        });

        expect(result.text).toBeTruthy();
        expect(result.text.length).toBeGreaterThan(10);
        console.log(`✅ Long prompt handled: ${longPrompt.length} chars input, ${result.text.length} chars output`);
      } catch (error) {
        // Some providers may have token limits
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('token') || errorMessage.includes('length') || errorMessage.includes('limit')) {
          console.log(`⚠️ Expected token limit error: ${errorMessage}`);
        } else {
          throw error;
        }
      }
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle prompts with special characters', async () => {
      const specialPrompt = 'Test with emojis 🚀🤖🎯 and symbols @#$%^&*()[]{}|\\:";\'<>?,./`~';

      try {
        const result = await provider.generateText({
          prompt: specialPrompt,
          maxTokens: 50,
          temperature: 0.5
        });

        expect(result.text).toBeTruthy();
        console.log(`✅ Special characters handled: "${specialPrompt}"`);
      } catch (error) {
        console.log(`❌ Special characters failed: ${(error as Error).message}`);
        throw error;
      }
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle prompts with multiple languages', async () => {
      const multiLangPrompt = 'English, Español, Français, Deutsch, 日本語, 中文, العربية, हिंदी';

      try {
        const result = await provider.generateText({
          prompt: `Recognize these languages: ${multiLangPrompt}`,
          maxTokens: 100,
          temperature: 0.5
        });

        expect(result.text).toBeTruthy();
        console.log(`✅ Multi-language handled: "${multiLangPrompt}"`);
      } catch (error) {
        console.log(`❌ Multi-language failed: ${(error as Error).message}`);
        throw error;
      }
    }, STRESS_TIMEOUT);
  });

  describe('Edge Case Parameters', () => {
    it.skipIf(!STRESS_ENABLED)('should handle extreme temperature values', async () => {
      const extremeTemps = [0.0, 0.1, 1.0, 1.5, 2.0];

      for (const temp of extremeTemps) {
        try {
          const result = await provider.generateText({
            prompt: 'Generate a creative response',
            maxTokens: 50,
            temperature: temp
          });

          expect(result.text).toBeTruthy();
          console.log(`✅ Temperature ${temp}: ${result.text.length} chars`);
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('temperature') || errorMessage.includes('parameter')) {
            console.log(`⚠️ Expected parameter error at temp ${temp}: ${errorMessage}`);
          } else {
            console.log(`❌ Unexpected error at temp ${temp}: ${errorMessage}`);
          }
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle extreme maxTokens values', async () => {
      const extremeTokens = [1, 10, 1000, 2000, 4000];

      for (const maxTokens of extremeTokens) {
        try {
          const result = await provider.generateText({
            prompt: 'Write about artificial intelligence',
            maxTokens,
            temperature: 0.7
          });

          expect(result.text).toBeTruthy();
          console.log(`✅ MaxTokens ${maxTokens}: ${result.text.length} chars`);

          // Very small token limits should produce short responses
          if (maxTokens <= 10) {
            expect(result.text.length).toBeLessThan(100);
          }
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('token') || errorMessage.includes('limit')) {
            console.log(`⚠️ Expected token limit error at ${maxTokens}: ${errorMessage}`);
          } else {
            console.log(`❌ Unexpected error at maxTokens ${maxTokens}: ${errorMessage}`);
          }
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }, STRESS_TIMEOUT);
  });

  describe('Error Recovery Under Load', () => {
    it.skipIf(!STRESS_ENABLED)('should maintain stability after errors', async () => {
      let successCount = 0;
      let errorCount = 0;

      // Intentionally trigger some errors, then verify recovery
      for (let i = 0; i < 5; i++) {
        try {
          // Alternate between valid and potentially problematic requests
          const prompt = i % 2 === 0
            ? 'Valid prompt for testing'
            : ''; // Empty prompt might cause errors

          await provider.generateText({
            prompt,
            maxTokens: 50,
            temperature: 0.5
          });

          successCount++;
        } catch (error) {
          errorCount++;
          console.log(`⚠️ Expected error ${i + 1}: ${(error as Error).message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // After errors, should still be able to generate valid responses
      const recoveryResult = await provider.generateText({
        prompt: 'Recovery test: generate a simple response',
        maxTokens: 50,
        temperature: 0.5
      });

      expect(recoveryResult.text).toBeTruthy();
      console.log(`📊 Error recovery: ${successCount} success, ${errorCount} errors, recovery successful`);
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle provider switching under stress', async () => {
      const providers = ['openai', 'bedrock', 'vertex'];
      const results: any[] = [];

      for (const providerName of providers) {
        try {
          const testProvider = AIProviderFactory.createProvider(providerName);

          const result = await testProvider.generateText({
            prompt: `Provider test: ${providerName}`,
            maxTokens: 50,
            temperature: 0.5
          });

          results.push({
            provider: providerName,
            success: true,
            contentLength: result.text.length
          });
        } catch (error) {
          results.push({
            provider: providerName,
            success: false,
            error: (error as Error).message
          });
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const successful = results.filter(r => r.success);
      console.log(`📊 Provider switching: ${successful.length}/${providers.length} providers working`);

      // At least one provider should work
      expect(successful.length).toBeGreaterThan(0);
    }, STRESS_TIMEOUT);
  });

  describe('Memory and Resource Management', () => {
    it.skipIf(!STRESS_ENABLED)('should handle many provider instances', async () => {
      const instanceCount = 10;
      const providers: AIProvider[] = [];

      // Create multiple provider instances
      for (let i = 0; i < instanceCount; i++) {
        try {
          const instance = createBestAIProvider();
          providers.push(instance);
        } catch (error) {
          console.log(`❌ Provider instance ${i + 1} failed: ${(error as Error).message}`);
        }
      }

      expect(providers.length).toBeGreaterThan(0);
      console.log(`✅ Created ${providers.length} provider instances`);

      // Test that they all work independently
      const promises = providers.slice(0, 3).map((p, i) =>
        p.generateText({
          prompt: `Instance test ${i + 1}`,
          maxTokens: 30,
          temperature: 0.5
        }).catch(error => ({ error: (error as Error).message }))
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && !('error' in r.value));

      console.log(`📊 Instance testing: ${successful.length}/${Math.min(3, providers.length)} instances successful`);
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle long-running operations', async () => {
      const longRunningPrompt = 'Write a detailed explanation of machine learning, including examples, applications, and future implications. Be comprehensive and educational.';

      const startTime = Date.now();
      try {
        const result = await provider.generateText({
          prompt: longRunningPrompt,
          maxTokens: 500,
          temperature: 0.7
        });

        const duration = Date.now() - startTime;
        expect(result.text).toBeTruthy();
        expect(result.text.length).toBeGreaterThan(100);

        console.log(`✅ Long operation: ${duration}ms, ${result.text.length} chars`);

        // Should complete within reasonable time
        expect(duration).toBeLessThan(60000);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ Long operation failed after ${duration}ms: ${(error as Error).message}`);

        // Even failures should not take too long
        expect(duration).toBeLessThan(60000);
        throw error;
      }
    }, STRESS_TIMEOUT);
  });

  describe('Boundary Testing', () => {
    it.skipIf(!STRESS_ENABLED)('should handle minimal viable requests', async () => {
      const minimalRequest = {
        prompt: 'Hi',
        maxTokens: 1,
        temperature: 0.5
      };

      try {
        const result = await provider.generateText(minimalRequest);
        expect(result.text).toBeTruthy();
        console.log(`✅ Minimal request: "${result.text}"`);
      } catch (error) {
        // Some providers might not support maxTokens: 1
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('token') || errorMessage.includes('minimum')) {
          console.log(`⚠️ Expected minimal token error: ${errorMessage}`);
        } else {
          throw error;
        }
      }
    }, STRESS_TIMEOUT);

    it.skipIf(!STRESS_ENABLED)('should handle repeated identical requests', async () => {
      const identicalPrompt = 'What is AI?';
      const repetitions = 5;
      const results: string[] = [];

      for (let i = 0; i < repetitions; i++) {
        try {
          const result = await provider.generateText({
            prompt: identicalPrompt,
            maxTokens: 50,
            temperature: 0.0 // Low temperature for more deterministic results
          });

          results.push(result.text);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`❌ Repetition ${i + 1} failed: ${(error as Error).message}`);
        }
      }

      expect(results.length).toBeGreaterThan(0);
      console.log(`✅ Identical requests: ${results.length}/${repetitions} successful`);

      // With temperature 0, results might be similar but don't have to be identical
      const uniqueResults = new Set(results).size;
      console.log(`📊 Unique responses: ${uniqueResults}/${results.length}`);
    }, STRESS_TIMEOUT);
  });
});
