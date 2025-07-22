import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

describe("CLI Tool Integration", () => {
  const toolsFile = join(process.cwd(), "test-custom-tools.js");

  beforeAll(() => {
    // Create a custom tools file that can be loaded by the CLI
    const toolsCode = `
// Custom tools for testing
export function registerTools(sdk) {
  sdk.registerTool('echoTool', {
    description: 'Echo back the input message',
    execute: (args) => {
      return { echoed: args.message || 'No message provided' };
    }
  });
  
  sdk.registerTool('randomNumber', {
    description: 'Generate a random number between min and max',
    execute: ({ min = 0, max = 100 }) => {
      const number = Math.floor(Math.random() * (max - min + 1)) + min;
      return { number, range: \`\${min}-\${max}\` };
    }
  });
}
`;
    writeFileSync(toolsFile, toolsCode);
  });

  afterAll(() => {
    // Clean up
    try {
      unlinkSync(toolsFile);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });

  describe("Basic CLI Commands", () => {
    it("should show help", async () => {
      const { stdout } = await execAsync("pnpm cli --help");
      expect(stdout).toContain("generate");
      expect(stdout).toContain("stream");
      expect(stdout).toContain("provider");
    });

    it("should list providers", async () => {
      const { stdout } = await execAsync("pnpm cli provider list");
      expect(stdout).toContain("openai");
      expect(stdout).toContain("google-ai");
      expect(stdout).toContain("anthropic");
    });
  });

  describe("Tool Usage via CLI", () => {
    it("should use built-in tools in generate command", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "What time is it?" --provider google-ai --max-tokens 200',
      );

      // Should contain time-related information
      expect(stdout.toLowerCase()).toMatch(/time|clock|\d{1,2}:\d{2}/);
    }, 30000);

    it("should use math tool via CLI", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Calculate 25 times 4" --provider google-ai --max-tokens 200',
      );

      // Should contain the result (100)
      expect(stdout).toContain("100");
    }, 30000);

    it("should stream with tools", async () => {
      const { stdout } = await execAsync(
        'pnpm cli stream "What is 15 plus 27?" --provider google-ai --max-tokens 200',
      );

      // Should contain the result (42)
      expect(stdout).toContain("42");
    }, 30000);
  });

  describe("Custom Tools via CLI (Future Enhancement)", () => {
    it.skip("should load custom tools from file", async () => {
      // This would require CLI enhancement to support --tools-file option
      const { stdout } = await execAsync(
        `pnpm cli generate "Echo this message: Hello CLI" --provider google-ai --tools-file ${toolsFile}`,
      );

      expect(stdout).toContain("Hello CLI");
    });

    it.skip("should use custom tool with parameters", async () => {
      const { stdout } = await execAsync(
        `pnpm cli generate "Generate a random number between 50 and 100" --provider google-ai --tools-file ${toolsFile}`,
      );

      // Should contain a number between 50 and 100
      expect(stdout).toMatch(/\b([5-9]\d|100)\b/);
    });
  });

  describe("Tool Discovery via CLI", () => {
    it.skip("should list available tools", async () => {
      // This would require a new CLI command
      const { stdout } = await execAsync("pnpm cli tools list");

      expect(stdout).toContain("getCurrentTime");
      expect(stdout).toContain("readFile");
      expect(stdout).toContain("calculateMath");
    });

    it.skip("should show tool details", async () => {
      const { stdout } = await execAsync(
        "pnpm cli tools describe getCurrentTime",
      );

      expect(stdout).toContain("Get current date and time");
      expect(stdout).toContain("No parameters required");
    });
  });

  describe("JSON Output with Tools", () => {
    it("should output JSON format with tool information", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "What is 10 divided by 2?" --provider google-ai --output-format json',
      );

      const response = JSON.parse(stdout);
      expect(response).toHaveProperty("content");
      expect(response.content).toContain("5");

      // May include tool usage information
      if (response.toolsUsed) {
        expect(response.toolsUsed).toContain("calculateMath");
      }
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle tool errors gracefully", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Read a file that does not exist: /nonexistent/file.txt" --provider google-ai',
      );

      // Should still get a response even if tool fails
      expect(stdout).toBeDefined();
      expect(stdout.length).toBeGreaterThan(0);
    }, 30000);
  });
});
