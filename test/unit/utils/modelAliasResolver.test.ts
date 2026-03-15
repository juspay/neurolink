import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelAliasConfig } from "../../../src/lib/types/generateTypes.js";

// Mock logger before importing the module under test
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { resolveModel } from "../../../src/lib/utils/modelAliasResolver.js";
import { logger } from "../../../src/lib/utils/logger.js";

describe("resolveModel (NL-004)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Early-return / pass-through cases
  // -------------------------------------------------------------------------

  describe("early-return when no resolution is needed", () => {
    it("returns undefined when model is undefined", () => {
      const config: ModelAliasConfig = {
        aliases: { "gpt-3": { target: "gpt-4", action: "redirect" } },
      };
      expect(resolveModel(undefined, config)).toBeUndefined();
    });

    it("returns empty string unchanged when model is empty string", () => {
      const config: ModelAliasConfig = {
        aliases: { "gpt-3": { target: "gpt-4", action: "redirect" } },
      };
      // Empty string is falsy, so resolveModel short-circuits
      expect(resolveModel("", config)).toBe("");
    });

    it("returns original model when config is undefined", () => {
      expect(resolveModel("gpt-4", undefined)).toBe("gpt-4");
    });

    it("returns original model when config.aliases is undefined", () => {
      const config = {} as ModelAliasConfig;
      expect(resolveModel("gpt-4", config)).toBe("gpt-4");
    });

    it("returns original model when aliases map is empty", () => {
      const config: ModelAliasConfig = { aliases: {} };
      expect(resolveModel("gpt-4", config)).toBe("gpt-4");
    });

    it("returns original model when model is not in the alias map", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3": { target: "gpt-4", action: "redirect" },
        },
      };
      expect(resolveModel("claude-3-opus", config)).toBe("claude-3-opus");
    });
  });

  // -------------------------------------------------------------------------
  // Action: "redirect"
  // -------------------------------------------------------------------------

  describe('action: "redirect"', () => {
    it("returns the target model", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3.5-turbo": {
            target: "gpt-4o-mini",
            action: "redirect",
          },
        },
      };
      expect(resolveModel("gpt-3.5-turbo", config)).toBe("gpt-4o-mini");
    });

    it("logs a debug message with the redirect details", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3.5-turbo": {
            target: "gpt-4o-mini",
            action: "redirect",
          },
        },
      };
      resolveModel("gpt-3.5-turbo", config);
      expect(logger.debug).toHaveBeenCalledOnce();
      expect(logger.debug).toHaveBeenCalledWith(
        "[ModelAlias] Redirecting model 'gpt-3.5-turbo' to 'gpt-4o-mini'",
      );
    });

    it("does not log a warning", () => {
      const config: ModelAliasConfig = {
        aliases: {
          old: { target: "new", action: "redirect" },
        },
      };
      resolveModel("old", config);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Action: "warn"
  // -------------------------------------------------------------------------

  describe('action: "warn"', () => {
    it("returns the target model (redirects the model)", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "text-davinci-003": {
            target: "gpt-4o",
            action: "warn",
            reason: "Davinci is deprecated.",
          },
        },
      };
      expect(resolveModel("text-davinci-003", config)).toBe("gpt-4o");
    });

    it("logs a warning with the reason when reason is provided", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "text-davinci-003": {
            target: "gpt-4o",
            action: "warn",
            reason: "Davinci is deprecated.",
          },
        },
      };
      resolveModel("text-davinci-003", config);
      expect(logger.warn).toHaveBeenCalledOnce();
      expect(logger.warn).toHaveBeenCalledWith(
        "[ModelAlias] Model 'text-davinci-003' is deprecated. Davinci is deprecated.",
        {
          requestedModel: "text-davinci-003",
          targetModel: "gpt-4o",
          reason: "Davinci is deprecated.",
        },
      );
    });

    it("logs a fallback warning message when reason is absent", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "old-model": {
            target: "new-model",
            action: "warn",
          },
        },
      };
      resolveModel("old-model", config);
      expect(logger.warn).toHaveBeenCalledOnce();
      expect(logger.warn).toHaveBeenCalledWith(
        "[ModelAlias] Model 'old-model' is deprecated. Redirecting to 'new-model'.",
        {
          requestedModel: "old-model",
          targetModel: "new-model",
          reason: undefined,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Action: "block"
  // -------------------------------------------------------------------------

  describe('action: "block"', () => {
    it("throws a NeuroLinkError with code MODEL_DEPRECATED", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3": {
            target: "gpt-4",
            action: "block",
            reason: "GPT-3 has been retired.",
          },
        },
      };

      expect(() => resolveModel("gpt-3", config)).toThrow();
      try {
        resolveModel("gpt-3", config);
      } catch (err: unknown) {
        const e = err as {
          code: string;
          message: string;
          category: string;
          severity: string;
          retriable: boolean;
          context: Record<string, unknown>;
          name: string;
        };
        expect(e.name).toBe("NeuroLinkError");
        expect(e.code).toBe("MODEL_DEPRECATED");
        expect(e.retriable).toBe(false);
        expect(e.category).toBe("validation");
        expect(e.severity).toBe("high");
      }
    });

    it("includes the custom reason in the error message when provided", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3": {
            target: "gpt-4",
            action: "block",
            reason: "GPT-3 has been retired.",
          },
        },
      };

      expect(() => resolveModel("gpt-3", config)).toThrowError(
        "Model 'gpt-3' is blocked. GPT-3 has been retired.",
      );
    });

    it("falls back to a default message when reason is absent", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3": {
            target: "gpt-4",
            action: "block",
          },
        },
      };

      expect(() => resolveModel("gpt-3", config)).toThrowError(
        "Model 'gpt-3' is blocked. Use 'gpt-4' instead.",
      );
    });

    it("includes context with requestedModel, suggestedModel, and reason", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3": {
            target: "gpt-4",
            action: "block",
            reason: "Retired.",
          },
        },
      };

      try {
        resolveModel("gpt-3", config);
        expect.unreachable("should have thrown");
      } catch (err: unknown) {
        const e = err as { context: Record<string, unknown> };
        expect(e.context).toEqual({
          requestedModel: "gpt-3",
          suggestedModel: "gpt-4",
          reason: "Retired.",
        });
      }
    });

    it("does not log anything (throws before logging)", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "gpt-3": { target: "gpt-4", action: "block" },
        },
      };

      expect(() => resolveModel("gpt-3", config)).toThrow();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Default / unknown action
  // -------------------------------------------------------------------------

  describe("unknown action (default case)", () => {
    it("returns the original model unchanged for an unrecognized action", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "some-model": {
            target: "other-model",
            action: "unknown-action" as "warn",
          },
        },
      };
      expect(resolveModel("some-model", config)).toBe("some-model");
    });

    it("does not log anything for an unrecognized action", () => {
      const config: ModelAliasConfig = {
        aliases: {
          "some-model": {
            target: "other-model",
            action: "unknown-action" as "redirect",
          },
        },
      };
      resolveModel("some-model", config);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Multiple aliases
  // -------------------------------------------------------------------------

  describe("multiple aliases in a single config", () => {
    const config: ModelAliasConfig = {
      aliases: {
        "gpt-3": { target: "gpt-4o", action: "block", reason: "Retired." },
        "gpt-3.5-turbo": { target: "gpt-4o-mini", action: "redirect" },
        "text-davinci-003": {
          target: "gpt-4",
          action: "warn",
          reason: "Davinci sunsetted.",
        },
      },
    };

    it("blocks gpt-3", () => {
      expect(() => resolveModel("gpt-3", config)).toThrow();
    });

    it("redirects gpt-3.5-turbo silently", () => {
      expect(resolveModel("gpt-3.5-turbo", config)).toBe("gpt-4o-mini");
    });

    it("warns and redirects text-davinci-003", () => {
      expect(resolveModel("text-davinci-003", config)).toBe("gpt-4");
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("passes through models not in the map", () => {
      expect(resolveModel("claude-3-opus", config)).toBe("claude-3-opus");
    });
  });
});
