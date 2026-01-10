// test/unit/action/actionInputs.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ActionInputs } from "../../../src/lib/types/actionTypes.js";

// Mock @actions/core
vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  getBooleanInput: vi.fn(),
  warning: vi.fn(),
  setFailed: vi.fn(),
  setSecret: vi.fn(),
}));

import * as core from "@actions/core";
import {
  parseActionInputs,
  validateProviderKey,
  buildEnvironmentVariables,
  maskSecrets,
  validateActionInputs,
} from "../../../src/lib/action/actionInputs.js";

describe("actionInputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a mock getInput with default values
  const createMockGetInput = (overrides: Record<string, string> = {}) => {
    const defaults: Record<string, string> = {
      prompt: "Test prompt",
      provider: "auto",
      command: "generate",
      temperature: "0.7",
      max_tokens: "4096",
      output_format: "text",
      timeout: "120",
      aws_region: "us-east-1",
      google_vertex_location: "us-central1",
      thinking_level: "medium",
      thinking_budget: "10000",
      neurolink_version: "latest",
      working_directory: ".",
      comment_tag: "neurolink-action",
    };
    return (name: string) => overrides[name] ?? defaults[name] ?? "";
  };

  describe("parseActionInputs", () => {
    it("should parse required prompt input", () => {
      vi.mocked(core.getInput).mockImplementation(createMockGetInput());
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.prompt).toBe("Test prompt");
      expect(inputs.provider).toBe("auto");
    });

    it("should parse comma-separated multimodal paths", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          image_paths: "img1.png, img2.jpg",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.imagePaths).toEqual(["img1.png", "img2.jpg"]);
    });

    it("should parse PDF paths from comma-separated input", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          pdf_paths: "doc1.pdf, doc2.pdf, doc3.pdf",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.pdfPaths).toEqual([
        "doc1.pdf",
        "doc2.pdf",
        "doc3.pdf",
      ]);
    });

    it("should parse CSV paths from comma-separated input", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          csv_paths: "data.csv,report.csv",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.csvPaths).toEqual(["data.csv", "report.csv"]);
    });

    it("should parse video paths from comma-separated input", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          video_paths: "video1.mp4, video2.mov",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.videoPaths).toEqual([
        "video1.mp4",
        "video2.mov",
      ]);
    });

    it("should handle empty multimodal paths", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          image_paths: "",
          pdf_paths: "",
          csv_paths: "",
          video_paths: "",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.imagePaths).toBeUndefined();
      expect(inputs.multimodal.pdfPaths).toBeUndefined();
      expect(inputs.multimodal.csvPaths).toBeUndefined();
      expect(inputs.multimodal.videoPaths).toBeUndefined();
    });

    it("should trim whitespace from multimodal paths", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          image_paths: "  img1.png  ,  img2.jpg  ",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.imagePaths).toEqual(["img1.png", "img2.jpg"]);
    });

    it("should filter empty entries from multimodal paths", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          image_paths: "img1.png,,img2.jpg,",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.multimodal.imagePaths).toEqual(["img1.png", "img2.jpg"]);
    });

    it("should parse extended thinking configuration when enabled", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          thinking_level: "high",
          thinking_budget: "50000",
        }),
      );
      vi.mocked(core.getBooleanInput).mockImplementation((name: string) => {
        if (name === "thinking_enabled") {
          return true;
        }
        return false;
      });

      const inputs = parseActionInputs();
      expect(inputs.thinking.enabled).toBe(true);
      expect(inputs.thinking.level).toBe("high");
      expect(inputs.thinking.budget).toBe(50000);
    });

    it("should parse all thinking levels correctly", () => {
      const levels = ["minimal", "low", "medium", "high"];
      for (const level of levels) {
        vi.mocked(core.getInput).mockImplementation(
          createMockGetInput({
            thinking_level: level,
          }),
        );
        vi.mocked(core.getBooleanInput).mockReturnValue(false);

        const inputs = parseActionInputs();
        expect(inputs.thinking.level).toBe(level);
      }
    });

    it("should use default thinking budget when not specified", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          thinking_budget: "",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.thinking.budget).toBe(10000);
    });

    it("should parse working directory", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          working_directory: "./src/app",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.workingDirectory).toBe("./src/app");
    });

    it("should use default working directory when not specified", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          working_directory: "",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.workingDirectory).toBe(".");
    });

    it("should parse output file path", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          output_file: "./output/result.json",
          openai_api_key: "sk-test",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.outputFile).toBe("./output/result.json");
    });

    it("should parse Google Cloud configuration", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          google_vertex_project: "my-project",
          google_vertex_location: "europe-west1",
          google_application_credentials: "base64encodedcreds",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.googleCloudConfig.googleVertexProject).toBe("my-project");
      expect(inputs.googleCloudConfig.googleVertexLocation).toBe(
        "europe-west1",
      );
      expect(inputs.googleCloudConfig.googleApplicationCredentials).toBe(
        "base64encodedcreds",
      );
    });

    it("should use default Google Vertex location when not specified", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          google_vertex_location: "",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.googleCloudConfig.googleVertexLocation).toBe("us-central1");
    });

    it("should parse system prompt", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          system_prompt: "You are a code reviewer",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      const inputs = parseActionInputs();
      expect(inputs.systemPrompt).toBe("You are a code reviewer");
    });

    it("should throw error when provider key is missing", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          provider: "openai",
          openai_api_key: "",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      expect(() => parseActionInputs()).toThrow(
        /API key for provider.*openai/i,
      );
    });

    it("should not throw error for auto provider without keys", () => {
      vi.mocked(core.getInput).mockImplementation(
        createMockGetInput({
          provider: "auto",
        }),
      );
      vi.mocked(core.getBooleanInput).mockReturnValue(false);

      expect(() => parseActionInputs()).not.toThrow();
    });
  });

  describe("validateProviderKey", () => {
    it("should return true when provider has required key", () => {
      const keys = { openaiApiKey: "sk-test" };
      expect(validateProviderKey("openai", keys)).toBe(true);
    });

    it("should return false when provider missing required key", () => {
      const keys = {};
      expect(validateProviderKey("openai", keys)).toBe(false);
    });

    it("should return true for auto provider", () => {
      const keys = {};
      expect(validateProviderKey("auto", keys)).toBe(true);
    });

    it("should return true for ollama (no key required)", () => {
      const keys = {};
      expect(validateProviderKey("ollama", keys)).toBe(true);
    });
  });

  describe("buildEnvironmentVariables", () => {
    it("should map provider keys to environment variables", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: { openaiApiKey: "sk-test" },
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
        enableTools: false,
        enableAnalytics: false,
        enableEvaluation: false,
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.OPENAI_API_KEY).toBe("sk-test");
      expect(env.AWS_REGION).toBe("us-east-1");
    });

    it("should set CI and non-interactive flags", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.CI).toBe("true");
      expect(env.NEUROLINK_NON_INTERACTIVE).toBe("true");
    });

    it("should map all provider API keys", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {
          openaiApiKey: "sk-openai",
          anthropicApiKey: "sk-anthropic",
          googleAiApiKey: "google-key",
          azureOpenaiApiKey: "azure-key",
          azureOpenaiEndpoint: "https://azure.endpoint",
          azureOpenaiDeployment: "deployment-name",
          mistralApiKey: "mistral-key",
          huggingfaceApiKey: "hf-key",
          openrouterApiKey: "or-key",
          litellmApiKey: "litellm-key",
          litellmBaseUrl: "https://litellm.url",
          openaiCompatibleApiKey: "compat-key",
          openaiCompatibleBaseUrl: "https://compat.url",
        },
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.OPENAI_API_KEY).toBe("sk-openai");
      expect(env.ANTHROPIC_API_KEY).toBe("sk-anthropic");
      expect(env.GOOGLE_AI_API_KEY).toBe("google-key");
      expect(env.AZURE_OPENAI_API_KEY).toBe("azure-key");
      expect(env.AZURE_OPENAI_ENDPOINT).toBe("https://azure.endpoint");
      expect(env.AZURE_OPENAI_DEPLOYMENT).toBe("deployment-name");
      expect(env.MISTRAL_API_KEY).toBe("mistral-key");
      expect(env.HUGGINGFACE_API_KEY).toBe("hf-key");
      expect(env.OPENROUTER_API_KEY).toBe("or-key");
      expect(env.LITELLM_API_KEY).toBe("litellm-key");
      expect(env.LITELLM_BASE_URL).toBe("https://litellm.url");
      expect(env.OPENAI_COMPATIBLE_API_KEY).toBe("compat-key");
      expect(env.OPENAI_COMPATIBLE_BASE_URL).toBe("https://compat.url");
    });

    it("should map AWS configuration", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: {
          awsAccessKeyId: "AKIATEST",
          awsSecretAccessKey: "secret-key",
          awsRegion: "eu-west-1",
          awsSessionToken: "session-token",
          bedrockModelId: "anthropic.claude-v2",
          sagemakerEndpoint: "my-sagemaker-endpoint",
        },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.AWS_ACCESS_KEY_ID).toBe("AKIATEST");
      expect(env.AWS_SECRET_ACCESS_KEY).toBe("secret-key");
      expect(env.AWS_REGION).toBe("eu-west-1");
      expect(env.AWS_SESSION_TOKEN).toBe("session-token");
      expect(env.BEDROCK_MODEL_ID).toBe("anthropic.claude-v2");
      expect(env.SAGEMAKER_DEFAULT_ENDPOINT).toBe("my-sagemaker-endpoint");
    });

    it("should map Google Cloud configuration", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: {
          googleVertexProject: "my-gcp-project",
          googleVertexLocation: "europe-west4",
        },
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.GOOGLE_VERTEX_PROJECT).toBe("my-gcp-project");
      expect(env.GOOGLE_VERTEX_LOCATION).toBe("europe-west4");
    });

    it("should map GitHub token when provided", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
        githubToken: "ghp_test_token",
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.GITHUB_TOKEN).toBe("ghp_test_token");
    });

    it("should not include undefined values", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {
          openaiApiKey: "sk-test",
          anthropicApiKey: undefined,
        },
        awsConfig: {
          awsRegion: "us-east-1",
          awsAccessKeyId: undefined,
        },
        googleCloudConfig: {
          googleVertexLocation: "us-central1",
          googleVertexProject: undefined,
        },
      };

      const env = buildEnvironmentVariables(inputs as ActionInputs);
      expect(env.OPENAI_API_KEY).toBe("sk-test");
      expect(env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(env.AWS_ACCESS_KEY_ID).toBeUndefined();
      expect(env.GOOGLE_VERTEX_PROJECT).toBeUndefined();
    });
  });

  describe("maskSecrets", () => {
    it("should mask all API keys", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {
          openaiApiKey: "sk-test",
          anthropicApiKey: "sk-ant-test",
        },
        awsConfig: {
          awsAccessKeyId: "AKIA...",
          awsSecretAccessKey: "secret",
          awsRegion: "us-east-1",
        },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
        githubToken: "ghp_test",
      };

      maskSecrets(inputs as ActionInputs);

      expect(core.setSecret).toHaveBeenCalledWith("sk-test");
      expect(core.setSecret).toHaveBeenCalledWith("sk-ant-test");
      expect(core.setSecret).toHaveBeenCalledWith("AKIA...");
      expect(core.setSecret).toHaveBeenCalledWith("secret");
      expect(core.setSecret).toHaveBeenCalledWith("ghp_test");
    });

    it("should mask Google Cloud credentials", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: {
          googleVertexLocation: "us-central1",
          googleApplicationCredentials: "base64-encoded-service-account",
        },
      };

      maskSecrets(inputs as ActionInputs);

      expect(core.setSecret).toHaveBeenCalledWith(
        "base64-encoded-service-account",
      );
    });

    it("should mask AWS session token", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: {
          awsAccessKeyId: "AKIA...",
          awsSecretAccessKey: "secret",
          awsSessionToken: "session-token-123",
          awsRegion: "us-east-1",
        },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
      };

      maskSecrets(inputs as ActionInputs);

      expect(core.setSecret).toHaveBeenCalledWith("session-token-123");
    });

    it("should handle missing optional keys gracefully", () => {
      const inputs: Partial<ActionInputs> = {
        providerKeys: {},
        awsConfig: { awsRegion: "us-east-1" },
        googleCloudConfig: { googleVertexLocation: "us-central1" },
      };

      // Should not throw
      expect(() => maskSecrets(inputs as ActionInputs)).not.toThrow();
    });
  });

  describe("validateActionInputs", () => {
    it("should return valid for correct inputs", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "Test prompt",
        temperature: 0.7,
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const result = validateActionInputs(inputs as ActionInputs);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for missing prompt", () => {
      const inputs: Partial<ActionInputs> = {
        prompt: "",
        temperature: 0.7,
        thinking: { enabled: false, level: "medium", budget: 10000 },
      };

      const result = validateActionInputs(inputs as ActionInputs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("prompt is required");
    });
  });
});
