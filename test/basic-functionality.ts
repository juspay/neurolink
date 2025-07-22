import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import { TEST_TIMEOUTS } from "./shared/test-timeouts";

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Provider-specific environment variables - supporting multiple auth methods
const PROVIDER_ENV_KEYS = {
  "google-ai": "GOOGLE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  bedrock: "AWS_ACCESS_KEY_ID",
  azure: "AZURE_OPENAI_API_KEY",
  vertex: [
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "GOOGLE_AUTH_CLIENT_EMAIL",
  ],
  huggingface: ["HUGGING_FACE_API_KEY", "HUGGINGFACE_API_KEY"],
  mistral: "MISTRAL_API_KEY",
  ollama: "OLLAMA_BASE_URL", // Ollama doesn't need API key, but needs URL
};

// Get provider configuration from environment (accessed at runtime)
const getTestProvider = () => {
  const validProviders = Object.keys(PROVIDER_ENV_KEYS);
  const provider = process.env.TEST_PROVIDER || "google-ai";
  return validProviders.includes(provider) ? provider : "google-ai";
};
const getTestModel = () => process.env.TEST_MODEL || "gemini-2.5-pro";
const getProviderEnvKey = () => {
  const keys = PROVIDER_ENV_KEYS[getTestProvider()];
  return Array.isArray(keys) ? keys[0] : keys;
};
const getProviderApiKey = () => {
  const keys = PROVIDER_ENV_KEYS[getTestProvider()];
  if (Array.isArray(keys)) {
    // Check multiple possible env keys and return the first one found
    for (const key of keys) {
      const value = process.env[key];
      if (value) {
        return value;
      }
    }
    return undefined;
  }
  return process.env[keys];
};

// Working CLI execution method (provider-agnostic)
const execCLI = async (
  args: string[],
  timeoutMs: number = 10000,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["cli", ...args], {
      stdio: "pipe",
      env: {
        ...process.env,
        // Set provider-specific API key
        [getProviderEnvKey()]: getProviderApiKey(),
      },
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
        reject(new Error(`CLI command failed with exit code ${code}`));
      }
    });
  });
};

/**
 * PROVIDER-AGNOSTIC BASIC FUNCTIONALITY TEST BATCH (5 tests)
 * Tests core CLI commands with configurable provider
 */

describe(`Basic Functionality Tests (${getTestProvider().toUpperCase()})`, () => {
  const timeout = TEST_TIMEOUTS.STANDARD; // 30 seconds per test
  const cliPrefix = `cd ${process.cwd()} && pnpm cli`;

  beforeAll(() => {
    // Verify environment for current provider
    const envKey = getProviderEnvKey();
    const apiKey = getProviderApiKey();

    console.log(`🤖 Testing Provider: ${getTestProvider()}`);
    console.log(`🔑 Environment Key: ${envKey}`);
    console.log(`✅ API Key Status: ${apiKey ? "Configured" : "Missing"}`);

    expect(
      apiKey,
      `${envKey} environment variable is required for ${getTestProvider()} provider`,
    ).toBeDefined();
  });

  // Add delay between tests to prevent rate limiting
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe(`Core CLI Commands (${getTestProvider()})`, () => {
    it(
      `should run generate command successfully with ${getTestProvider()}`,
      async () => {
        const args = [
          "generate",
          "Test",
          "--provider",
          getTestProvider(),
          "--max-tokens",
          "2000",
          "--output-format",
          "text",
        ];
        console.log("🔍 INPUT: pnpm cli", args.join(" "));
        console.log(`🤖 Provider: ${getTestProvider()}`);

        const { stdout } = await execCLI(args);
        console.log("📤 OUTPUT:", stdout.substring(0, 400) + "...");
        console.log(
          "✅ VALIDATION: Contains Generated Content:",
          stdout.includes("Generated Content:"),
        );

        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      `should run stream command successfully with ${getTestProvider()}`,
      async () => {
        const args = [
          "stream",
          "Count to 3",
          "--provider",
          getTestProvider(),
          "--max-tokens",
          "2000",
          "--disable-tools",
        ];
        console.log("🔍 INPUT: pnpm cli", args.join(" "));
        console.log(`🤖 Provider: ${getTestProvider()}`);

        const { stdout } = await execCLI(args, 8000); // Shorter timeout for streaming
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log(
          "✅ VALIDATION: Contains Streaming:",
          stdout.includes("Streaming..."),
        );

        expect(stdout).toContain("Streaming...");
      },
      timeout,
    );

    it(
      "should show version",
      async () => {
        const { stdout } = await execCLI(["--version"]);
        expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Should show version number
      },
      timeout,
    );

    it(
      "should show help",
      async () => {
        const { stdout } = await execCLI(["--help"]);
        expect(stdout).toContain("Usage:");
      },
      timeout,
    );

    it(
      "should show help for config commands",
      async () => {
        const { stdout } = await execCLI(["config", "--help"]);
        expect(stdout).toContain("config");
      },
      timeout,
    );
  });
});
