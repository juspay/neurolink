import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    // Environment setup for Node.js testing
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],

    // Performance optimization (from document requirements)
    testTimeout: 30000, // 30s max per test
    maxConcurrency: 10, // Parallel execution
    // Note: mockReset is intentionally NOT enabled because it resets mock
    // implementations to return undefined, breaking mocks defined via vi.mock().
    // Instead, we use clearMocks which only clears call history.
    clearMocks: true,

    // Coverage configuration (document requirements: >90% SDK, >85% CLI)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/lib/**/*", "src/cli/**/*"], // Now includes BOTH SDK and CLI
      exclude: ["src/test/**/*", "node_modules/", "dist/", "**/*.d.ts"],
      thresholds: {
        "src/lib/**/*": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "src/cli/**/*": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },

    // File matching patterns
    include: ["src/**/*.{test,spec}.{js,ts}", "test/**/*.{test,spec}.{js,ts}"],
    exclude: [
      "node_modules/",
      "dist/",
      ".svelte-kit/",
      "test/continuous-test-suite.ts", // Existing file to be migrated
    ],
  },

  // Path resolution for imports - using __dirname for reliable path resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "./test"),
      "@mocks": path.resolve(__dirname, "./test/mocks"),
    },
  },
});
