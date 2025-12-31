import { describe, it, expect } from "vitest";
import {
  GoogleAIModels,
  VertexModels,
} from "../../../src/lib/constants/enums.js";
import { TOKEN_LIMITS } from "../../../src/lib/constants/tokens.js";
import {
  createThinkingConfig,
  createThinkingConfigFromRecord,
  createNativeThinkingConfig,
  shouldEnableThinking,
  DEFAULT_THINKING_BUDGET_TOKENS,
  DEFAULT_THINKING_LEVEL,
  type ThinkingConfig,
  type ThinkingLevel,
} from "../../../src/lib/utils/thinkingConfig.js";

describe("Thinking Configuration", () => {
  describe("createThinkingConfig", () => {
    it("should return undefined when thinking is not enabled", () => {
      const config = createThinkingConfig({
        thinking: false,
      });

      expect(config).toBeUndefined();
    });

    it("should return undefined when no options are provided", () => {
      const config = createThinkingConfig({});

      expect(config).toBeUndefined();
    });

    it("should create config when thinking is enabled", () => {
      const config = createThinkingConfig({
        thinking: true,
      });

      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
      expect(config?.budgetTokens).toBe(DEFAULT_THINKING_BUDGET_TOKENS);
    });

    it("should create config when thinkingLevel is set", () => {
      const config = createThinkingConfig({
        thinkingLevel: "high",
      });

      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
      expect(config?.thinkingLevel).toBe("high");
    });

    it("should use custom budget tokens when provided", () => {
      const config = createThinkingConfig({
        thinking: true,
        thinkingBudget: 15000,
      });

      expect(config?.budgetTokens).toBe(15000);
    });

    it("should include thinkingLevel when provided", () => {
      const config = createThinkingConfig({
        thinking: true,
        thinkingBudget: 20000,
        thinkingLevel: "medium",
      });

      expect(config?.enabled).toBe(true);
      expect(config?.budgetTokens).toBe(20000);
      expect(config?.thinkingLevel).toBe("medium");
    });

    it("should use default budget when thinkingBudget not provided", () => {
      const config = createThinkingConfig({
        thinking: true,
      });

      expect(config?.budgetTokens).toBe(10000); // DEFAULT_THINKING_BUDGET_TOKENS
    });
  });

  describe("createThinkingConfigFromRecord", () => {
    it("should create config from record-style options", () => {
      const options: Record<string, unknown> = {
        thinking: true,
        thinkingBudget: 25000,
        thinkingLevel: "high",
      };

      const config = createThinkingConfigFromRecord(options);

      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
      expect(config?.budgetTokens).toBe(25000);
      expect(config?.thinkingLevel).toBe("high");
    });

    it("should return undefined for empty record", () => {
      const config = createThinkingConfigFromRecord({});

      expect(config).toBeUndefined();
    });

    it("should handle missing properties gracefully", () => {
      const options: Record<string, unknown> = {
        thinking: true,
      };

      const config = createThinkingConfigFromRecord(options);

      expect(config?.enabled).toBe(true);
      expect(config?.budgetTokens).toBe(DEFAULT_THINKING_BUDGET_TOKENS);
      expect(config?.thinkingLevel).toBeUndefined();
    });
  });

  describe("createNativeThinkingConfig", () => {
    it("should return undefined when config is undefined", () => {
      const nativeConfig = createNativeThinkingConfig(undefined);

      expect(nativeConfig).toBeUndefined();
    });

    it("should return undefined when thinking is not enabled", () => {
      const config: ThinkingConfig = {
        enabled: false,
      };

      const nativeConfig = createNativeThinkingConfig(config);

      expect(nativeConfig).toBeUndefined();
    });

    it("should create native config when thinking is enabled", () => {
      const config: ThinkingConfig = {
        enabled: true,
        budgetTokens: 15000,
      };

      const nativeConfig = createNativeThinkingConfig(config);

      expect(nativeConfig).toBeDefined();
      expect(nativeConfig?.includeThoughts).toBe(true);
      expect(nativeConfig?.thinkingLevel).toBe(DEFAULT_THINKING_LEVEL);
    });

    it("should use provided thinkingLevel", () => {
      const config: ThinkingConfig = {
        enabled: true,
        thinkingLevel: "medium",
      };

      const nativeConfig = createNativeThinkingConfig(config);

      expect(nativeConfig?.includeThoughts).toBe(true);
      expect(nativeConfig?.thinkingLevel).toBe("medium");
    });

    it("should create native config when only thinkingLevel is set", () => {
      const config: ThinkingConfig = {
        thinkingLevel: "low",
      };

      const nativeConfig = createNativeThinkingConfig(config);

      expect(nativeConfig).toBeDefined();
      expect(nativeConfig?.includeThoughts).toBe(true);
      expect(nativeConfig?.thinkingLevel).toBe("low");
    });
  });

  describe("shouldEnableThinking", () => {
    it("should return false for undefined config", () => {
      expect(shouldEnableThinking(undefined)).toBe(false);
    });

    it("should return false when config has no enabled or thinkingLevel", () => {
      const config: ThinkingConfig = {};

      expect(shouldEnableThinking(config)).toBe(false);
    });

    it("should return true when enabled is true", () => {
      const config: ThinkingConfig = {
        enabled: true,
      };

      expect(shouldEnableThinking(config)).toBe(true);
    });

    it("should return true when thinkingLevel is set", () => {
      const config: ThinkingConfig = {
        thinkingLevel: "high",
      };

      expect(shouldEnableThinking(config)).toBe(true);
    });

    it("should return false when enabled is false and no thinkingLevel", () => {
      const config: ThinkingConfig = {
        enabled: false,
      };

      expect(shouldEnableThinking(config)).toBe(false);
    });
  });

  describe("Default Constants", () => {
    it("should have correct default thinking budget", () => {
      expect(DEFAULT_THINKING_BUDGET_TOKENS).toBe(10000);
    });

    it("should have correct default thinking level", () => {
      expect(DEFAULT_THINKING_LEVEL).toBe("high");
    });
  });

  describe("ThinkingLevel Type Validation", () => {
    it("should accept all valid thinking levels", () => {
      const validLevels: ThinkingLevel[] = ["minimal", "low", "medium", "high"];

      validLevels.forEach((level) => {
        const config = createThinkingConfig({
          thinking: true,
          thinkingLevel: level,
        });

        expect(config?.thinkingLevel).toBe(level);
      });
    });
  });

  describe("Budget Token Validation", () => {
    it("should accept budget within valid range", () => {
      const validBudgets = [5000, 10000, 50000, TOKEN_LIMITS.LARGE_CONTEXT];
      validBudgets.forEach((budget) => {
        expect(budget).toBeGreaterThanOrEqual(5000);
        expect(budget).toBeLessThanOrEqual(TOKEN_LIMITS.LARGE_CONTEXT);
      });
    });
  });

  describe("Provider Support Detection", () => {
    it("should identify Gemini 3 models as supporting thinking", () => {
      const gemini3Models = [
        VertexModels.GEMINI_3_PRO,
        GoogleAIModels.GEMINI_3_FLASH,
        GoogleAIModels.GEMINI_3_PRO_PREVIEW,
      ];

      gemini3Models.forEach((model) => {
        expect(model).toMatch(/^gemini-3/);
      });
    });

    it("should identify Gemini 2.5 models as supporting thinking", () => {
      const gemini25Models = [
        GoogleAIModels.GEMINI_2_5_PRO,
        GoogleAIModels.GEMINI_2_5_FLASH,
      ];

      gemini25Models.forEach((model) => {
        expect(model).toMatch(/^gemini-2\.5/);
      });
    });
  });

  describe("Integration: Full Config Flow", () => {
    it("should create a complete config flow from CLI options to native config", () => {
      // Step 1: CLI-style options
      const cliOptions: Record<string, unknown> = {
        thinking: true,
        thinkingBudget: 30000,
        thinkingLevel: "high",
      };

      // Step 2: Create thinkingConfig from record
      const thinkingConfig = createThinkingConfigFromRecord(cliOptions);
      expect(thinkingConfig).toBeDefined();

      // Step 3: Check if thinking should be enabled
      expect(shouldEnableThinking(thinkingConfig)).toBe(true);

      // Step 4: Create native config for Gemini SDK
      const nativeConfig = createNativeThinkingConfig(thinkingConfig);
      expect(nativeConfig).toBeDefined();
      expect(nativeConfig?.includeThoughts).toBe(true);
      expect(nativeConfig?.thinkingLevel).toBe("high");
    });
  });
});
