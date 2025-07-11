/**
 * Enhanced Test Setup for NeuroLink
 * Loads environment variables and configures test environment with proper cleanup
 */

import { config } from "dotenv";
import { vi, afterEach, afterAll } from "vitest";

// Load environment variables from .env file
config();

// Set test environment variables
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key-openai";
process.env.GOOGLE_VERTEX_PROJECT =
  process.env.GOOGLE_VERTEX_PROJECT || "test-project";
process.env.GOOGLE_VERTEX_LOCATION =
  process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
process.env.AWS_ACCESS_KEY_ID =
  process.env.AWS_ACCESS_KEY_ID || "AKIA-TEST-ACCESS-KEY";
process.env.AWS_SECRET_ACCESS_KEY =
  process.env.AWS_SECRET_ACCESS_KEY || "test-secret-key-12345";
process.env.AWS_SESSION_TOKEN =
  process.env.AWS_SESSION_TOKEN || "test-session-token";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.NODE_ENV = "test";

// Use Vitest's fake timers for test isolation and cleanup
vi.useFakeTimers();

// Import CLI helper for process cleanup
let killAllSpawnedProcesses: (() => void) | undefined;
(async () => {
  try {
    const cliHelper = await import("./helpers/cli-test-helper.js");
    killAllSpawnedProcesses = cliHelper.killAllSpawnedProcesses;
  } catch (error) {
    // CLI helper not available, continue without it
  }
})();

// 🔧 FIX: Enhanced cleanup to prevent hanging tests
afterEach(async () => {
  // Clean up vitest mocks and timers
  vi.clearAllTimers();
  vi.restoreAllMocks();

  // Kill spawned processes if helper is available
  if (killAllSpawnedProcesses) {
    killAllSpawnedProcesses();
  }
});

afterAll(async () => {
  // Final cleanup
  if (killAllSpawnedProcesses) {
    killAllSpawnedProcesses();
  }

  // Wait for final async operations
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// Note: Removed global AWS SDK mocking to prevent side effects in tests that need real behavior.
// Individual test files should mock services as needed using vi.mock() within their own scope.

if (!process.env.CI) {
  console.log("✅ Enhanced test environment configured with proper cleanup");
  // Optionally log environment variables only in local development, not in CI
  console.log("🔑 Environment variables loaded:", {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "***" : "missing",
    GOOGLE_VERTEX_PROJECT: process.env.GOOGLE_VERTEX_PROJECT || "not set",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "***" : "missing",
  });
}
