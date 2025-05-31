import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAI } from '../lib/providers/openAI.js';
import { AmazonBedrock } from '../lib/providers/amazonBedrock.js';
import { GoogleVertexAI } from '../lib/providers/googleVertexAI.js';
import { AIProviderFactory } from '../lib/core/factory.js';

describe('Zephyr-Mind AI Providers', () => {
  describe('OpenAI Provider', () => {
    it('should create OpenAI provider successfully', () => {
      const provider = new OpenAI('gpt-4');

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('OpenAI');
    });

    it('should be an AI provider', () => {
      const provider = new OpenAI('gpt-4');

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe('function');
    });
  });

  describe('Amazon Bedrock Provider', () => {
    it('should create Bedrock provider successfully', () => {
      const provider = new AmazonBedrock('anthropic.claude-3-sonnet-20240229-v1:0');

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('AmazonBedrock');
    });

    it('should be an AI provider', () => {
      const provider = new AmazonBedrock('anthropic.claude-3-sonnet-20240229-v1:0');

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe('function');
    });
  });

  describe('Google Vertex AI Provider', () => {
    it('should create Vertex AI provider successfully', () => {
      const provider = new GoogleVertexAI('gemini-pro');

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('GoogleVertexAI');
    });

    it('should be an AI provider', () => {
      const provider = new GoogleVertexAI('gemini-pro');

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe('function');
    });
  });

  describe('AI Provider Factory', () => {
    beforeAll(() => {
      // Set up test environment variables
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.AWS_REGION = 'us-east-1';
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    });

    it('should create providers by name', () => {
      const openaiProvider = AIProviderFactory.createProvider('openai');
      const bedrockProvider = AIProviderFactory.createProvider('bedrock');
      const vertexProvider = AIProviderFactory.createProvider('vertex');

      expect(openaiProvider).toBeDefined();
      expect(bedrockProvider).toBeDefined();
      expect(vertexProvider).toBeDefined();
    });

    it('should create best available provider', () => {
      const provider = AIProviderFactory.createBestProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe('function');
    });

    it('should create provider with fallback', () => {
      const { primary, fallback } = AIProviderFactory.createProviderWithFallback('openai', 'bedrock');
      expect(primary).toBeDefined();
      expect(fallback).toBeDefined();
      expect(primary.constructor.name).toBe('OpenAI');
      expect(fallback.constructor.name).toBe('AmazonBedrock');
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        AIProviderFactory.createProvider('unknown');
      }).toThrow('Unknown provider: unknown');
    });
  });
});
