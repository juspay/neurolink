import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { OpenAI } from '../lib/providers/openAI.js';
import { AmazonBedrock } from '../lib/providers/amazonBedrock.js';
import { GoogleVertexAI } from '../lib/providers/googleVertexAI.js';
import { AIProviderFactory } from '../lib/core/factory.js';

// Mock environment setup
beforeAll(() => {
  // Set up test environment variables for all providers
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.AWS_ACCESS_KEY_ID = 'test-aws-key-id';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
  process.env.AWS_REGION = 'us-east-1';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = 'test-google-credentials.json';
  process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  process.env.GOOGLE_VERTEX_PROJECT = 'test-vertex-project';
  process.env.GOOGLE_VERTEX_LOCATION = 'us-central1';
});

// Mock the AI SDK functions
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({
    // Mock what the OpenAI model would return
  }))
}));

// Mock the Amazon Bedrock SDK - IMPORTANT: createAmazonBedrock returns a function!
vi.mock('@ai-sdk/amazon-bedrock', () => ({
  amazonBedrock: vi.fn(() => ({
    // Mock what the Bedrock model would return
  })),
  createAmazonBedrock: vi.fn(() => {
    // This needs to return a function that can be called with modelName
    return vi.fn(() => ({
      // Mock the Bedrock model instance
    }));
  })
}));

vi.mock('@ai-sdk/google-vertex', () => ({
  googleVertexAI: vi.fn(() => ({
    // Mock what the Vertex AI model would return
  }))
}));

// Mock the AI SDK core functions
vi.mock('ai', () => ({
  streamText: vi.fn(() => ({
    textStream: {
      [Symbol.asyncIterator]: async function* () {
        yield 'test response';
      }
    }
  })),
  generateText: vi.fn(() => ({
    text: 'test response',
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30
    }
  })),
  Output: { object: vi.fn() },
}));

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
    beforeEach(() => {
      // Ensure environment variables are set for each test
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.AWS_ACCESS_KEY_ID = 'test-aws-key-id';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
      process.env.AWS_REGION = 'us-east-1';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'test-google-credentials.json';
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
