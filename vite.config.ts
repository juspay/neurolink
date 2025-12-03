import { sveltekit } from "@sveltejs/kit/vite";
import type { UserConfig } from "vite";

// Extend Vite config to support Vitest's test property
interface VitestConfig extends Omit<UserConfig, "plugins"> {
  // Use 'unknown' to avoid Plugin type conflicts from multiple Vite versions in pnpm
  plugins?: unknown;
  test?: {
    include?: string[];
    exclude?: string[];
    testTimeout?: number;
    hookTimeout?: number;
    globals?: boolean;
    pool?: "threads" | "forks";
    poolOptions?: Record<string, unknown>;
    isolate?: boolean;
    maxConcurrency?: number;
    bail?: number;
    reporters?: string[];
    outputFile?: string;
    onConsoleLog?: (log: string, type: "stdout" | "stderr") => void;
  };
}

const config: VitestConfig = {
  plugins: [sveltekit()],

  // FIXED test configuration - prevents hanging with execAsync
  test: {
    include: ["test/**/*.ts"], // Include all .ts files in test/ directory
    exclude: ["**/node_modules/**"],
    testTimeout: 30000, // 30 seconds max per test (reduce if possible)
    hookTimeout: 10000, // Reduced to detect hangs faster
    globals: true, // Enable describe, it, expect globally

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
    reporters: ["verbose", "json"],
    outputFile: "test-results.json",
    onConsoleLog: (log: string, _type: "stdout" | "stderr") => {
      if (log.includes("timeout") || log.includes("hanging")) {
        console.error(`🚨 Potential hanging test: ${log}`);
      }
    },
  },
};

export default config;
