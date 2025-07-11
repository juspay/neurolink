import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],

  // Enhanced test timeout configuration
  test: {
    testTimeout: 30000, // 30 seconds max per test
    hookTimeout: 10000, // 10 seconds for setup/teardown
    teardownTimeout: 10000, // 10 seconds for cleanup
    setupFiles: ["src/test/setup.ts"],

    // Use forks instead of threads for process spawning
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution
        minForks: 1,
        maxForks: 4, // Limit concurrent forks
      },
    },

    // Force test isolation
    isolate: true,

    // Bail early on hangs
    bail: 1,

    // Enhanced debugging
    logHeapUsage: true,
    onConsoleLog: (log: string, type: "stdout" | "stderr") => {
      if (log.includes("timeout") || log.includes("hanging")) {
        console.error(`🚨 Potential hanging test: ${log}`);
      }
    },
  },
} as any); // Type assertion to handle vite/vitest version conflicts
