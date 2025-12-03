/**
 * Global type definitions for test environment
 * Provides proper typing for global test utilities and configuration
 */

export type TestConfigType = {
  timeout: number;
  providers: string[];
  mockResponses: boolean;
};

declare global {
  var TestConfig: TestConfigType;
}

// Re-export for convenience
export {};
