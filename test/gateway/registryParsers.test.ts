/**
 * Registry Parsers Tests
 *
 * Tests for parsing different registry response formats
 *
 * @see src/lib/gateway/registryParsers.ts
 */

import { describe, it, expect } from "vitest";
import {
  parseModelsDevResponse,
  parseOpenRouterResponse,
  parseCustomRegistry,
  mergeModelSources,
  normalizeModelInfo,
  type CustomRegistrySchema,
} from "../../src/lib/gateway/registryParsers.js";
import type { GatewayModelInfo } from "../../src/lib/gateway/types.js";

describe("Registry Parsers", () => {
  describe("parseModelsDevResponse", () => {
    it("should parse valid models.dev response", () => {
      const response = {
        models: [
          {
            id: "gpt-4",
            provider: "openai",
            name: "GPT-4",
            description: "GPT-4 model",
            context_length: 8192,
            max_output_tokens: 4096,
            pricing: { input: 0.03, output: 0.06 },
            capabilities: { chat: true },
          },
        ],
      };
      const result = parseModelsDevResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("gpt-4");
      expect(result[0].provider).toBe("openai");
    });

    it("should handle missing models array", () => {
      const response = {};
      const result = parseModelsDevResponse(response);
      expect(result).toEqual([]);
    });

    it("should filter invalid model entries", () => {
      const response = {
        models: [
          { id: "valid", provider: "openai", name: "Valid" },
          { id: "", provider: "invalid" }, // Missing name
          { provider: "missing-id", name: "Test" }, // Missing id
        ],
      };
      const result = parseModelsDevResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("valid");
    });

    it("should map pricing correctly", () => {
      const response = {
        models: [
          {
            id: "gpt-4",
            provider: "openai",
            name: "GPT-4",
            pricing: { input: 0.03, output: 0.06 },
          },
        ],
      };
      const result = parseModelsDevResponse(response);
      expect(result[0].pricing?.inputPer1M).toBe(0.03);
      expect(result[0].pricing?.outputPer1M).toBe(0.06);
    });

    it("should parse capabilities", () => {
      const response = {
        models: [
          {
            id: "gpt-4",
            provider: "openai",
            name: "GPT-4",
            capabilities: {
              chat: true,
              vision: true,
              function_calling: true,
            },
          },
        ],
      };
      const result = parseModelsDevResponse(response);
      expect(result[0].capabilities.chat).toBe(true);
      expect(result[0].capabilities.imageInput).toBe(true);
      expect(result[0].capabilities.functionCalling).toBe(true);
    });

    it("should handle missing optional fields", () => {
      const response = {
        models: [{ id: "minimal", provider: "test", name: "Minimal" }],
      };
      const result = parseModelsDevResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("minimal");
      expect(result[0].pricing).toBeUndefined();
    });
  });

  describe("parseOpenRouterResponse", () => {
    it("should parse valid OpenRouter response", () => {
      const response = {
        data: [
          {
            id: "openai/gpt-4",
            name: "GPT-4",
            description: "Test",
            context_length: 8192,
            pricing: { prompt: "0.00003", completion: "0.00006" },
          },
        ],
      };
      const result = parseOpenRouterResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("openai/gpt-4");
    });

    it("should handle missing data array", () => {
      const response = {};
      const result = parseOpenRouterResponse(response);
      expect(result).toEqual([]);
    });

    it("should parse provider/model ID format", () => {
      const response = {
        data: [{ id: "anthropic/claude-3", name: "Claude 3" }],
      };
      const result = parseOpenRouterResponse(response);
      expect(result[0].provider).toBe("anthropic");
      expect(result[0].modelName).toBe("claude-3");
    });

    it("should convert pricing to per-1M format", () => {
      const response = {
        data: [
          {
            id: "test/model",
            name: "Test",
            pricing: { prompt: "0.00003", completion: "0.00006" },
          },
        ],
      };
      const result = parseOpenRouterResponse(response);
      expect(result[0].pricing?.inputPer1M).toBe(30);
      expect(result[0].pricing?.outputPer1M).toBe(60);
    });

    it("should infer capabilities from supported_parameters", () => {
      const response = {
        data: [
          {
            id: "test/model",
            name: "Test",
            supported_parameters: ["tools", "images", "response_format"],
          },
        ],
      };
      const result = parseOpenRouterResponse(response);
      expect(result[0].capabilities.functionCalling).toBe(true);
      expect(result[0].capabilities.imageInput).toBe(true);
      expect(result[0].capabilities.jsonMode).toBe(true);
    });

    it("should handle missing optional fields", () => {
      const response = {
        data: [{ id: "test/model", name: "Test" }],
      };
      const result = parseOpenRouterResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].pricing).toBeUndefined();
    });
  });

  describe("parseCustomRegistry", () => {
    it("should parse custom format with schema", () => {
      const data = {
        models: [{ model_id: "test", provider_name: "openai", model_name: "GPT" }],
      };
      const schema: CustomRegistrySchema = {
        modelsPath: "models",
        fieldMappings: {
          id: "model_id",
          provider: "provider_name",
          modelName: "model_name",
        },
      };
      const result = parseCustomRegistry(data, schema);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test");
    });

    it("should navigate nested modelsPath", () => {
      const data = {
        data: { models: [{ id: "test", provider: "openai", name: "Test" }] },
      };
      const schema: CustomRegistrySchema = {
        modelsPath: "data.models",
        fieldMappings: { id: "id", provider: "provider", modelName: "name" },
      };
      const result = parseCustomRegistry(data, schema);
      expect(result).toHaveLength(1);
    });

    it("should handle flat array format", () => {
      const data = [{ id: "test", provider: "openai", name: "Test" }];
      const schema: CustomRegistrySchema = {
        fieldMappings: { id: "id", provider: "provider", modelName: "name" },
      };
      const result = parseCustomRegistry(data, schema);
      expect(result).toHaveLength(1);
    });

    it("should apply field mappings", () => {
      const data = {
        models: [{ custom_id: "m1", custom_provider: "p1", custom_name: "n1" }],
      };
      const schema: CustomRegistrySchema = {
        modelsPath: "models",
        fieldMappings: {
          id: "custom_id",
          provider: "custom_provider",
          modelName: "custom_name",
        },
      };
      const result = parseCustomRegistry(data, schema);
      expect(result[0].id).toBe("m1");
      expect(result[0].provider).toBe("p1");
    });

    it("should handle missing required fields", () => {
      const data = {
        models: [{ id: "valid", provider: "p1", name: "n1" }, { id: "" }],
      };
      const schema: CustomRegistrySchema = {
        modelsPath: "models",
        fieldMappings: { id: "id", provider: "provider", modelName: "name" },
      };
      const result = parseCustomRegistry(data, schema);
      expect(result).toHaveLength(1);
    });

    it("should infer provider from ID when not mapped", () => {
      const data = {
        models: [{ id: "openai/gpt-4", name: "GPT-4" }],
      };
      const schema: CustomRegistrySchema = {
        modelsPath: "models",
        fieldMappings: { id: "id", modelName: "name" },
      };
      const result = parseCustomRegistry(data, schema);
      expect(result[0].provider).toBe("openai");
    });
  });

  describe("mergeModelSources", () => {
    it("should merge models from multiple sources", () => {
      const source1: GatewayModelInfo[] = [
        { id: "m1", provider: "p1", modelName: "Model 1", displayName: "Model 1", capabilities: {} },
      ];
      const source2: GatewayModelInfo[] = [
        { id: "m2", provider: "p2", modelName: "Model 2", displayName: "Model 2", capabilities: {} },
      ];
      const result = mergeModelSources([source1, source2]);
      expect(result).toHaveLength(2);
    });

    it("should deduplicate by model ID", () => {
      const source1: GatewayModelInfo[] = [
        { id: "m1", provider: "p1", modelName: "Model 1", displayName: "V1", capabilities: {} },
      ];
      const source2: GatewayModelInfo[] = [
        { id: "m1", provider: "p1", modelName: "Model 1", displayName: "V2", capabilities: {} },
      ];
      const result = mergeModelSources([source1, source2]);
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe("V1"); // First source wins
    });

    it("should respect priority order", () => {
      const high: GatewayModelInfo[] = [
        { id: "m1", provider: "p1", modelName: "High", displayName: "High", capabilities: {} },
      ];
      const low: GatewayModelInfo[] = [
        { id: "m1", provider: "p1", modelName: "Low", displayName: "Low", capabilities: {} },
      ];
      const result = mergeModelSources([high, low], ["high", "low"]);
      expect(result[0].displayName).toBe("High");
    });

    it("should handle empty sources", () => {
      const result = mergeModelSources([[], []]);
      expect(result).toEqual([]);
    });
  });

  describe("normalizeModelInfo", () => {
    it("should lowercase ID and provider", () => {
      const model: GatewayModelInfo = {
        id: "GPT-4",
        provider: "OpenAI",
        modelName: "GPT-4",
        displayName: "GPT-4",
        capabilities: {},
      };
      const result = normalizeModelInfo(model);
      expect(result.id).toBe("gpt-4");
      expect(result.provider).toBe("openai");
    });

    it("should trim whitespace", () => {
      const model: GatewayModelInfo = {
        id: "  gpt-4  ",
        provider: "  openai  ",
        modelName: "  GPT-4  ",
        displayName: "GPT-4",
        capabilities: {},
      };
      const result = normalizeModelInfo(model);
      expect(result.id).toBe("gpt-4");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("GPT-4");
    });

    it("should set default display name", () => {
      const model: GatewayModelInfo = {
        id: "gpt-4",
        provider: "openai",
        modelName: "GPT-4",
        displayName: "",
        capabilities: {},
      };
      const result = normalizeModelInfo(model);
      expect(result.displayName).toBe("GPT-4");
    });

    it("should fill missing capabilities with defaults", () => {
      const model: GatewayModelInfo = {
        id: "gpt-4",
        provider: "openai",
        modelName: "GPT-4",
        displayName: "GPT-4",
        capabilities: { chat: true },
      };
      const result = normalizeModelInfo(model);
      expect(result.capabilities.chat).toBe(true);
      expect(result.capabilities.completion).toBe(true); // Default
      expect(result.capabilities.streaming).toBe(true); // Default
    });
  });
});
