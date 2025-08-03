/**
 * Minimal test setup for NeuroLink test infrastructure
 * Created to resolve missing dependency blocking all tests
 */

// Mock environment variables for testing
process.env.NODE_ENV = "test";

// Basic test configuration
export const testConfig = {
  timeout: 10000,
  retries: 1,
  environment: "test",
};

// Mock provider configurations for tests
export const mockProviderConfig = {
  openai: { apiKey: "test-key" },
  anthropic: { apiKey: "test-key" },
  google: { apiKey: "test-key" },
  ollama: { baseUrl: "http://localhost:11434" },
};

// Test utility functions
export function createMockProvider(name: string) {
  return {
    name,
    generate: async () => ({ content: `Mock response from ${name}` }),
    getConfig: () =>
      mockProviderConfig[name as keyof typeof mockProviderConfig],
  };
}

// Setup logging for tests
export function setupTestLogging() {
  // Suppress logs during testing unless DEBUG=1
  if (!process.env.DEBUG) {
    console.log = () => {};
    console.debug = () => {};
  }
}

// Initialize test environment
setupTestLogging();

export default {
  testConfig,
  mockProviderConfig,
  createMockProvider,
  setupTestLogging,
};
