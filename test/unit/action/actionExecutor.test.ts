// test/unit/action/actionExecutor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  ActionInputs,
  CliResponse,
} from "../../../src/lib/types/actionTypes.js";

vi.mock("@actions/exec", () => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

vi.mock("@actions/core", () => ({
  info: vi.fn(),
  debug: vi.fn(),
  isDebug: vi.fn().mockReturnValue(false),
}));

vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
}));

import * as exec from "@actions/exec";
import * as fs from "fs";
import {
  buildCliArgs,
  executeNeurolink,
  transformCliResponse,
  installNeurolink,
  runNeurolink,
} from "../../../src/lib/action/actionExecutor.js";

describe("actionExecutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCliArgs", () => {
    it("should build basic generate command args with correct flag casing", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test prompt",
        command: "generate",
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        outputFormat: "json",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
        enableAnalytics: false,
        enableEvaluation: false,
        timeout: 120,
        debug: false,
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("generate");
      expect(args).toContain("--provider");
      expect(args).toContain("openai");
      expect(args).toContain("--model");
      expect(args).toContain("gpt-4o");
      // Verify camelCase flags (NOT kebab-case)
      expect(args).toContain("--maxTokens");
      expect(args).not.toContain("--max-tokens");
    });

    it("should add analytics and evaluation flags with correct casing", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test",
        command: "generate",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
        enableAnalytics: true,
        enableEvaluation: true,
      };

      const args = buildCliArgs(inputs as ActionInputs);

      // Verify camelCase (NOT kebab-case)
      expect(args).toContain("--enableAnalytics");
      expect(args).toContain("--enableEvaluation");
      expect(args).not.toContain("--enable-analytics");
      expect(args).not.toContain("--enable-evaluation");
    });

    it("should add multimodal image paths", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Analyze these images",
        command: "generate",
        multimodal: {
          imagePaths: ["image1.png", "image2.jpg", "image3.webp"],
        },
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      // Each image should have its own --image flag
      const imageFlags = args.filter((arg) => arg === "--image");
      expect(imageFlags).toHaveLength(3);
      expect(args).toContain("image1.png");
      expect(args).toContain("image2.jpg");
      expect(args).toContain("image3.webp");
    });

    it("should add multimodal PDF paths", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Summarize these PDFs",
        command: "generate",
        multimodal: {
          pdfPaths: ["doc1.pdf", "doc2.pdf"],
        },
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      const pdfFlags = args.filter((arg) => arg === "--pdf");
      expect(pdfFlags).toHaveLength(2);
      expect(args).toContain("doc1.pdf");
      expect(args).toContain("doc2.pdf");
    });

    it("should add multimodal CSV paths", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Analyze this data",
        command: "generate",
        multimodal: {
          csvPaths: ["data.csv", "report.csv"],
        },
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      const csvFlags = args.filter((arg) => arg === "--csv");
      expect(csvFlags).toHaveLength(2);
      expect(args).toContain("data.csv");
      expect(args).toContain("report.csv");
    });

    it("should add multimodal video paths", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Describe these videos",
        command: "generate",
        multimodal: {
          videoPaths: ["video1.mp4", "video2.mov"],
        },
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      const videoFlags = args.filter((arg) => arg === "--video");
      expect(videoFlags).toHaveLength(2);
      expect(args).toContain("video1.mp4");
      expect(args).toContain("video2.mov");
    });

    it("should add all multimodal paths when provided together", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Analyze all files",
        command: "generate",
        multimodal: {
          imagePaths: ["img.png"],
          pdfPaths: ["doc.pdf"],
          csvPaths: ["data.csv"],
          videoPaths: ["clip.mp4"],
        },
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("--image");
      expect(args).toContain("img.png");
      expect(args).toContain("--pdf");
      expect(args).toContain("doc.pdf");
      expect(args).toContain("--csv");
      expect(args).toContain("data.csv");
      expect(args).toContain("--video");
      expect(args).toContain("clip.mp4");
    });

    it("should add extended thinking flags when enabled", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Complex reasoning task",
        command: "generate",
        multimodal: {},
        thinking: {
          enabled: true,
          level: "high",
          budget: 50000,
        },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("--thinking");
      expect(args).toContain("--thinkingLevel");
      expect(args).toContain("high");
      expect(args).toContain("--thinkingBudget");
      expect(args).toContain("50000");
      // Verify camelCase (NOT kebab-case)
      expect(args).not.toContain("--thinking-level");
      expect(args).not.toContain("--thinking-budget");
    });

    it("should not add thinking flags when disabled", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Simple task",
        command: "generate",
        multimodal: {},
        thinking: {
          enabled: false,
          level: "medium",
          budget: 10000,
        },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).not.toContain("--thinking");
      expect(args).not.toContain("--thinkingLevel");
      expect(args).not.toContain("--thinkingBudget");
    });

    it("should add different thinking levels", () => {
      const levels = ["minimal", "low", "medium", "high"] as const;

      for (const level of levels) {
        const inputs: Partial<ActionInputs> = {
          prompt: "Task",
          command: "generate",
          multimodal: {},
          thinking: { enabled: true, level, budget: 10000 },
        };

        const args = buildCliArgs(inputs as ActionInputs);
        expect(args).toContain(level);
      }
    });

    it("should add system prompt when provided", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Hello",
        command: "generate",
        systemPrompt: "You are a helpful assistant",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("--system");
      expect(args).toContain("You are a helpful assistant");
    });

    it("should add timeout when provided", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test",
        command: "generate",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
        timeout: 300,
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("--timeout");
      expect(args).toContain("300");
    });

    it("should add debug flag when enabled", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test",
        command: "generate",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
        debug: true,
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("--debug");
    });

    it("should not add provider flag for auto provider", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test",
        command: "generate",
        provider: "auto",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).not.toContain("--provider");
    });

    it("should always include JSON format and quiet flags", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test",
        command: "generate",
        multimodal: {},
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const args = buildCliArgs(inputs as ActionInputs);

      expect(args).toContain("--format");
      expect(args).toContain("json");
      expect(args).toContain("--quiet");
      expect(args).toContain("--noColor");
    });
  });

  describe("transformCliResponse", () => {
    it("should transform CLI token format to action format", () => {
      const cliResponse: CliResponse = {
        content: "Hello",
        provider: "openai",
        model: "gpt-4o",
        usage: {
          input: 100,
          output: 50,
          total: 150,
        },
        responseTime: 500,
        analytics: {
          provider: "openai",
          tokenUsage: { input: 100, output: 50, total: 150 },
          requestDuration: 500,
          timestamp: "2024-01-01",
          cost: 0.001,
        },
      };

      const result = transformCliResponse(cliResponse);

      // Verify token field transformation
      expect(result.usage?.promptTokens).toBe(100);
      expect(result.usage?.completionTokens).toBe(50);
      expect(result.usage?.totalTokens).toBe(150);
      // Verify cost extracted from analytics
      expect(result.cost).toBe(0.001);
      // Verify responseTime renamed to executionTime
      expect(result.executionTime).toBe(500);
    });

    it("should scale evaluation score from 1-10 to 0-100", () => {
      const cliResponse: CliResponse = {
        content: "Hello",
        evaluation: {
          relevance: 8,
          accuracy: 9,
          completeness: 7,
          overall: 8,
          isOffTopic: false,
          reasoning: "Good response",
        },
      };

      const result = transformCliResponse(cliResponse);

      expect(result.evaluation?.overallScore).toBe(80); // 8 * 10
      expect(result.evaluation?.relevance).toBe(8);
    });
  });

  describe("executeNeurolink", () => {
    it("should execute CLI and transform output", async () => {
      // The JSON must be formatted with { on its own line for the parser to detect it
      const mockOutput = `{
  "content": "AI response",
  "provider": "openai",
  "model": "gpt-4o",
  "usage": { "input": 100, "output": 50, "total": 150 }
}`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const result = await executeNeurolink(["generate", "test"], {});

      expect(result.success).toBe(true);
      expect(result.response).toBe("AI response");
      // Verify transformation happened
      expect(result.usage?.promptTokens).toBe(100);
    });

    it("should handle CLI errors", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "API key invalid",
      });

      const result = await executeNeurolink(["generate", "test"], {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key invalid");
    });

    it("should handle non-JSON output gracefully", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "This is plain text output without JSON",
        stderr: "",
      });

      const result = await executeNeurolink(["generate", "test"], {});

      expect(result.success).toBe(true);
      expect(result.response).toBe("This is plain text output without JSON");
    });

    it("should handle stdout with log lines before JSON", async () => {
      const mockOutput = `[INFO] Starting...
[DEBUG] Loading config
{
  "content": "AI response with preamble",
  "provider": "anthropic",
  "model": "claude-3"
}`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const result = await executeNeurolink(["generate", "test"], {});

      expect(result.success).toBe(true);
      expect(result.response).toBe("AI response with preamble");
      expect(result.provider).toBe("anthropic");
    });

    it("should handle exception during execution", async () => {
      vi.mocked(exec.getExecOutput).mockRejectedValue(
        new Error("Network timeout"),
      );

      const result = await executeNeurolink(["generate", "test"], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });

    it("should pass environment variables to CLI", async () => {
      const mockOutput = `{
  "content": "test"
}`;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      await executeNeurolink(["generate", "test"], {
        OPENAI_API_KEY: "sk-test",
        CUSTOM_VAR: "value",
      });

      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "neurolink",
        ["generate", "test"],
        expect.objectContaining({
          env: expect.objectContaining({
            OPENAI_API_KEY: "sk-test",
            CUSTOM_VAR: "value",
          }),
        }),
      );
    });
  });

  describe("installNeurolink", () => {
    it("should install latest version when version is latest", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await installNeurolink("latest");

      expect(exec.exec).toHaveBeenCalledWith(
        "npm",
        ["install", "-g", "@juspay/neurolink"],
        expect.any(Object),
      );
    });

    it("should install specific version when version is provided", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await installNeurolink("1.2.3");

      expect(exec.exec).toHaveBeenCalledWith(
        "npm",
        ["install", "-g", "@juspay/neurolink@1.2.3"],
        expect.any(Object),
      );
    });
  });

  describe("runNeurolink", () => {
    const createBaseInputs = (): ActionInputs => ({
      prompt: "Test prompt",
      provider: "openai",
      model: "gpt-4o",
      command: "generate",
      temperature: 0.7,
      maxTokens: 4096,
      outputFormat: "json",
      multimodal: {},
      thinking: { enabled: false, level: "medium", budget: 10000 },
      enableAnalytics: false,
      enableEvaluation: false,
      enableTools: false,
      postComment: false,
      updateExistingComment: false,
      commentTag: "neurolink-action",
      timeout: 120,
      debug: false,
      neurolinkVersion: "latest",
      workingDirectory: ".",
      providerKeys: { openaiApiKey: "sk-test" },
      awsConfig: { awsRegion: "us-east-1" },
      googleCloudConfig: { googleVertexLocation: "us-central1" },
    });

    it("should decode base64 Google Cloud credentials and write to file", async () => {
      // Mock a valid base64-encoded JSON credentials file
      const credentials = { type: "service_account", project_id: "test" };
      const base64Credentials = Buffer.from(
        JSON.stringify(credentials),
      ).toString("base64");

      const inputs = createBaseInputs();
      inputs.googleCloudConfig.googleApplicationCredentials = base64Credentials;

      const mockOutput = `{
  "content": "response"
}`;
      vi.mocked(exec.exec).mockResolvedValue(0);
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      // Store original env
      const originalRunnerTemp = process.env.RUNNER_TEMP;
      process.env.RUNNER_TEMP = "/tmp/runner";

      await runNeurolink(inputs);

      // Verify fs.writeFileSync was called with decoded credentials
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/tmp/runner/vertex-credentials.json",
        JSON.stringify(credentials),
      );

      // Verify GOOGLE_APPLICATION_CREDENTIALS was set in env
      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "neurolink",
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            GOOGLE_APPLICATION_CREDENTIALS:
              "/tmp/runner/vertex-credentials.json",
          }),
        }),
      );

      // Restore env
      process.env.RUNNER_TEMP = originalRunnerTemp;
    });

    it("should use /tmp when RUNNER_TEMP is not set", async () => {
      const credentials = { type: "service_account" };
      const base64Credentials = Buffer.from(
        JSON.stringify(credentials),
      ).toString("base64");

      const inputs = createBaseInputs();
      inputs.googleCloudConfig.googleApplicationCredentials = base64Credentials;

      const mockOutput = `{
  "content": "response"
}`;
      vi.mocked(exec.exec).mockResolvedValue(0);
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      // Remove RUNNER_TEMP
      const originalRunnerTemp = process.env.RUNNER_TEMP;
      delete process.env.RUNNER_TEMP;

      await runNeurolink(inputs);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/tmp/vertex-credentials.json",
        expect.any(String),
      );

      // Restore env
      process.env.RUNNER_TEMP = originalRunnerTemp;
    });

    it("should not write credentials file when not provided", async () => {
      const inputs = createBaseInputs();
      // Ensure no credentials are set
      inputs.googleCloudConfig.googleApplicationCredentials = undefined;

      const mockOutput = `{
  "content": "response"
}`;
      vi.mocked(exec.exec).mockResolvedValue(0);
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      await runNeurolink(inputs);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should install neurolink before execution", async () => {
      const inputs = createBaseInputs();
      inputs.neurolinkVersion = "2.0.0";

      const mockOutput = `{
  "content": "response"
}`;
      vi.mocked(exec.exec).mockResolvedValue(0);
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      await runNeurolink(inputs);

      // Verify install was called first with correct version
      expect(exec.exec).toHaveBeenCalledWith(
        "npm",
        ["install", "-g", "@juspay/neurolink@2.0.0"],
        expect.any(Object),
      );
    });

    it("should build CLI args correctly", async () => {
      const inputs = createBaseInputs();
      inputs.provider = "anthropic";
      inputs.model = "claude-3-opus";

      const mockOutput = `{
  "content": "response"
}`;
      vi.mocked(exec.exec).mockResolvedValue(0);
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      await runNeurolink(inputs);

      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "neurolink",
        expect.arrayContaining([
          "generate",
          "Test prompt",
          "--provider",
          "anthropic",
          "--model",
          "claude-3-opus",
        ]),
        expect.any(Object),
      );
    });
  });
});
