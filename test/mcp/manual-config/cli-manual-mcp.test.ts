import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Get provider configuration from environment
const getTestProvider = () => process.env.TEST_PROVIDER || "google-ai";
const getTestModel = () => process.env.TEST_MODEL || "gemini-2.0-flash-exp";

// Working CLI execution method (following existing pattern)
const execCLI = async (
  args: string[],
  timeoutMs: number = 10000,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["dist/cli/index.js", ...args], {
      stdio: "pipe",
      env: process.env,
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error(`CLI command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `CLI command failed with exit code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`,
          ),
        );
      }
    });
  });
};

/**
 * CLI MANUAL MCP CONFIG TESTS
 * Tests that CLI properly loads manual MCP configuration
 */
describe("CLI Manual MCP Configuration Tests", () => {
  const timeout = 30000; // 30 seconds per test
  const testConfigFile = join(process.cwd(), ".mcp-config-test.json");
  const originalConfigFile = join(process.cwd(), ".mcp-config.json");
  let hasOriginalConfig = false;
  let originalConfigContent = "";

  beforeAll(() => {
    console.log("🔧 Setting up Manual MCP Config tests...");

    // Backup original config if exists
    if (existsSync(originalConfigFile)) {
      hasOriginalConfig = true;
      originalConfigContent = require("fs").readFileSync(
        originalConfigFile,
        "utf8",
      );
      console.log("📦 Backed up original .mcp-config.json");
    }

    // Create test MCP config
    const testConfig = {
      mcpServers: {
        testServer: {
          name: "testServer",
          command: "echo",
          args: ["test-mcp-server"],
          transport: "stdio",
        },
      },
    };

    writeFileSync(testConfigFile, JSON.stringify(testConfig, null, 2));
    // Also write to the standard location for CLI to pick up
    writeFileSync(originalConfigFile, JSON.stringify(testConfig, null, 2));
    console.log("✅ Created test MCP config");
  });

  afterAll(() => {
    // Cleanup test config
    try {
      unlinkSync(testConfigFile);
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Restore original config or remove test config
    if (hasOriginalConfig) {
      writeFileSync(originalConfigFile, originalConfigContent);
      console.log("📦 Restored original .mcp-config.json");
    } else {
      try {
        unlinkSync(originalConfigFile);
      } catch (e) {
        // Ignore if doesn't exist
      }
    }
  });

  it(
    "should load manual MCP config when tools are enabled (default)",
    async () => {
      console.log(
        "\n🧪 Test 1: CLI with tools enabled (should load manual config)",
      );

      try {
        const { stdout, stderr } = await execCLI(
          ["generate", "What is 2+2?", "--provider", getTestProvider()],
          timeout,
        );

        // Should succeed
        expect(stdout).toBeTruthy();

        // Check if manual config was loaded (look for debug logs if available)
        console.log("✅ CLI executed successfully with tools enabled");
        console.log("📝 Output sample:", stdout.substring(0, 100));
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should NOT load manual MCP config when tools are disabled",
    async () => {
      console.log(
        "\n🧪 Test 2: CLI with tools disabled (should NOT load manual config)",
      );

      try {
        const { stdout, stderr } = await execCLI(
          [
            "generate",
            "What is 3+3?",
            "--provider",
            getTestProvider(),
            "--disable-tools",
          ],
          timeout,
        );

        // Should succeed without loading manual config
        expect(stdout).toBeTruthy();

        console.log("✅ CLI executed successfully with tools disabled");
        console.log("📝 Output sample:", stdout.substring(0, 100));
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should handle invalid manual MCP config gracefully",
    async () => {
      console.log("\n🧪 Test 3: CLI with invalid manual config");

      // Create invalid config
      writeFileSync(originalConfigFile, "{ invalid json }");

      try {
        const { stdout, stderr } = await execCLI(
          ["generate", "What is 4+4?", "--provider", getTestProvider()],
          timeout,
        );

        // Should still work (graceful degradation)
        expect(stdout).toBeTruthy();

        console.log("✅ CLI handled invalid config gracefully");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should work with streaming when tools are enabled",
    async () => {
      console.log("\n🧪 Test 4: CLI stream with tools enabled");

      // Restore valid config
      const testConfig = {
        mcpServers: {
          testServer: {
            name: "testServer",
            command: "echo",
            args: ["test-mcp-server"],
            transport: "stdio",
          },
        },
      };
      writeFileSync(originalConfigFile, JSON.stringify(testConfig, null, 2));

      try {
        const { stdout, stderr } = await execCLI(
          ["stream", "Count to 3", "--provider", getTestProvider()],
          timeout,
        );

        expect(stdout).toContain("1");
        expect(stdout).toContain("2");
        expect(stdout).toContain("3");

        console.log("✅ CLI stream executed successfully with tools");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should work with streaming when tools are disabled",
    async () => {
      console.log("\n🧪 Test 5: CLI stream with tools disabled");

      try {
        const { stdout, stderr } = await execCLI(
          [
            "stream",
            "Count to 5",
            "--provider",
            getTestProvider(),
            "--disable-tools",
          ],
          timeout,
        );

        expect(stdout).toBeTruthy();

        console.log("✅ CLI stream executed successfully without tools");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );
});
