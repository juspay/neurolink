import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],

  // FIXED test configuration - prevents hanging with execAsync
  test: {
    include: ["test/**/*.ts"], // Include all .ts files in test/ directory
    testTimeout: 30000, // 30 seconds max per test (reduce if possible)
    hookTimeout: 10000, // Reduced to detect hangs faster
    globals: true, // Enable describe, it, expect globally
    setupFiles: ["src/test/setup-minimal.ts"], // Use minimal setup

    // SIMPLE execution configuration - no complex pooling
    // Switched from "forks" to "threads" for improved performance and parallelism.
    // Note: Using "threads" may reduce process isolation, which can affect tests that spawn external processes.
    // Ensure your tests do not rely on full process isolation, or revert to "forks" if needed.
    pool: "threads", // Use threads instead of forks
    poolOptions: {
      threads: {
        singleThread: false, // Allow some parallelism
        minThreads: 1,
        maxThreads: 4, // Increased parallelism for faster test execution
      },
    },

    // Enable isolation with proper cleanup to prevent interference
    isolate: true, // Ensure test isolation for reliability
    maxConcurrency: 1, // Sequential execution for stability

    // Don't bail early - let all tests complete
    bail: 0,

    // Basic reporting - no complex logging that might hang
    reporter: ["verbose", "json"],
    outputFile: "test-results.json",
    onConsoleLog: (log: string, type: "stdout" | "stderr") => {
      if (log.includes("timeout") || log.includes("hanging")) {
        console.error(`🚨 Potential hanging test: ${log}`);
      }
    },
  },
} as any); // Type assertion to handle vite/vitest version conflicts
