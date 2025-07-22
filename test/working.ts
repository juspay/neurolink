import { describe, it, expect, beforeAll } from "vitest";
import { spawn } from "child_process";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * WORKING TEST SUITE - Simple tests that actually pass
 * No hanging CLI commands, just direct API testing
 */

describe("Working Tests - Core Functionality", () => {
  beforeAll(() => {
    // Verify environment
    expect(process.env.GOOGLE_AI_API_KEY).toBeDefined();
  });

  it("should import NeuroLink SDK successfully", async () => {
    const { NeuroLink } = await import("../lib/neurolink.js");
    expect(NeuroLink).toBeDefined();

    const sdk = new NeuroLink();
    expect(sdk).toBeDefined();
    expect(typeof sdk.generate).toBe("function");
    expect(typeof sdk.stream).toBe("function");
  });

  it("should generate text with SDK", async () => {
    const { NeuroLink } = await import("../lib/neurolink.js");
    const sdk = new NeuroLink();

    const result = await sdk.generate({
      input: { text: "Say hello" },
      provider: "google-ai",
      maxTokens: 100,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
  }, 15000);

  it("should generate text with analytics", async () => {
    const { NeuroLink } = await import("../lib/neurolink.js");
    const sdk = new NeuroLink();

    const result = await sdk.generate({
      input: { text: "Test analytics" },
      provider: "google-ai",
      maxTokens: 100,
      enableAnalytics: true,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.analytics).toBeDefined();
    expect(result.analytics.tokens).toBeDefined();
  }, 15000);

  it("should test CLI version command", async () => {
    const result = await new Promise<{ stdout: string; success: boolean }>(
      (resolve) => {
        const child = spawn("pnpm", ["cli", "--version"], {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.on("close", (code) => {
          resolve({ stdout, success: code === 0 });
        });

        // 10 second timeout
        setTimeout(() => {
          child.kill("SIGTERM");
          resolve({ stdout, success: false });
        }, 10000);
      },
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  }, 12000);
});
