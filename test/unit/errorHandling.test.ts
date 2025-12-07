import { describe, it, expect } from "vitest";
import {
  NeuroLinkError,
  ErrorFactory,
  ERROR_CODES,
  ERROR_CODE_METADATA,
  type ErrorCode,
} from "../../src/lib/utils/errorHandling.js";
import { ErrorSeverity } from "../../src/lib/constants/enums.js";

describe("Error Code System", () => {
  describe("ERROR_CODES", () => {
    it("should have all required error code categories", () => {
      // Check for each category
      const toolCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("TOOL_"),
      );
      const providerCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("PROVIDER_"),
      );
      const networkCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("NETWORK_"),
      );
      const authCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("AUTH_"),
      );
      const validationCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("VALIDATION_"),
      );
      const configCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("CONFIG_"),
      );
      const mcpCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("MCP_"),
      );
      const hitlCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("HITL_"),
      );
      const systemCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("SYSTEM_"),
      );
      const memoryCodes = Object.keys(ERROR_CODES).filter((key) =>
        key.startsWith("MEMORY_"),
      );

      expect(toolCodes.length).toBeGreaterThan(0);
      expect(providerCodes.length).toBeGreaterThan(0);
      expect(networkCodes.length).toBeGreaterThan(0);
      expect(authCodes.length).toBeGreaterThan(0);
      expect(validationCodes.length).toBeGreaterThan(0);
      expect(configCodes.length).toBeGreaterThan(0);
      expect(mcpCodes.length).toBeGreaterThan(0);
      expect(hitlCodes.length).toBeGreaterThan(0);
      expect(systemCodes.length).toBeGreaterThan(0);
      expect(memoryCodes.length).toBeGreaterThan(0);
    });

    it("should have uppercase constant names", () => {
      for (const key of Object.keys(ERROR_CODES)) {
        expect(key).toBe(key.toUpperCase());
        expect(key).toMatch(/^[A-Z_]+$/);
      }
    });

    it("should have unique error code values", () => {
      const values = Object.values(ERROR_CODES);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it("should follow naming convention CATEGORY_DESCRIPTION", () => {
      for (const code of Object.values(ERROR_CODES)) {
        expect(code).toMatch(/^[A-Z]+_[A-Z_]+$/);
      }
    });
  });

  describe("ERROR_CODE_METADATA", () => {
    it("should have metadata for all error codes", () => {
      for (const code of Object.values(ERROR_CODES)) {
        expect(ERROR_CODE_METADATA[code as ErrorCode]).toBeDefined();
      }
    });

    it("should have valid metadata structure", () => {
      for (const [code, metadata] of Object.entries(ERROR_CODE_METADATA)) {
        expect(metadata.code).toBe(code);
        expect(metadata.category).toBeDefined();
        expect(typeof metadata.retriable).toBe("boolean");
        expect(metadata.severity).toMatch(/^(low|medium|high|critical)$/);

        if (metadata.httpStatusCode) {
          expect(metadata.httpStatusCode).toBeGreaterThanOrEqual(100);
          expect(metadata.httpStatusCode).toBeLessThan(600);
        }
      }
    });

    it("should mark appropriate errors as retriable", () => {
      // Network and timeout errors should be retriable
      expect(ERROR_CODE_METADATA[ERROR_CODES.NETWORK_TIMEOUT].retriable).toBe(
        true,
      );
      expect(ERROR_CODE_METADATA[ERROR_CODES.NETWORK_ERROR].retriable).toBe(
        true,
      );
      expect(ERROR_CODE_METADATA[ERROR_CODES.TOOL_TIMEOUT].retriable).toBe(
        true,
      );

      // Validation errors should not be retriable
      expect(
        ERROR_CODE_METADATA[ERROR_CODES.VALIDATION_INVALID_PARAMETERS]
          .retriable,
      ).toBe(false);
      expect(
        ERROR_CODE_METADATA[ERROR_CODES.AUTH_INVALID_CREDENTIALS].retriable,
      ).toBe(false);
    });

    it("should have appropriate severity levels", () => {
      // Critical errors
      expect(ERROR_CODE_METADATA[ERROR_CODES.MEMORY_EXHAUSTED].severity).toBe(
        "critical",
      );
      expect(
        ERROR_CODE_METADATA[ERROR_CODES.PROVIDER_AUTH_FAILED].severity,
      ).toBe("critical");

      // High severity errors
      expect(
        ERROR_CODE_METADATA[ERROR_CODES.TOOL_EXECUTION_FAILED].severity,
      ).toBe("high");
      expect(ERROR_CODE_METADATA[ERROR_CODES.NETWORK_ERROR].severity).toBe(
        "high",
      );

      // Medium severity errors
      expect(ERROR_CODE_METADATA[ERROR_CODES.TOOL_NOT_FOUND].severity).toBe(
        "medium",
      );
      expect(
        ERROR_CODE_METADATA[ERROR_CODES.VALIDATION_INVALID_PARAMETERS].severity,
      ).toBe("medium");
    });
  });
});

describe("NeuroLinkError", () => {
  describe("constructor", () => {
    it("should create error with required fields", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_NOT_FOUND,
        message: "Test error message",
      });

      expect(error.code).toBe(ERROR_CODES.TOOL_NOT_FOUND);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("NeuroLinkError");
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should use metadata from ERROR_CODE_METADATA", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_NOT_FOUND,
        message: "Tool not found",
      });

      const metadata = ERROR_CODE_METADATA[ERROR_CODES.TOOL_NOT_FOUND];
      expect(error.category).toBe(metadata.category);
      expect(error.severity).toBe(metadata.severity);
      expect(error.retriable).toBe(metadata.retriable);
      expect(error.httpStatusCode).toBe(metadata.httpStatusCode);
    });

    it("should allow overriding metadata values", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_NOT_FOUND,
        message: "Test error",
        severity: ErrorSeverity.CRITICAL,
        retriable: true,
      });

      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.retriable).toBe(true);
    });

    it("should include optional context", () => {
      const context = { toolName: "testTool", params: { key: "value" } };
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_EXECUTION_FAILED,
        message: "Execution failed",
        context,
      });

      expect(error.context).toEqual(context);
    });

    it("should preserve original error information", () => {
      const originalError = new Error("Original error");
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_EXECUTION_FAILED,
        message: "Wrapped error",
        originalError,
      });

      expect(error.context.originalMessage).toBe("Original error");
      expect(error.context.originalStack).toBeDefined();
    });

    it("should include provider information", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_AUTH_FAILED,
        message: "Auth failed",
        provider: "openai",
      });

      expect(error.provider).toBe("openai");
    });

    it("should include tool and server information", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_EXECUTION_FAILED,
        message: "Execution failed",
        toolName: "testTool",
        serverId: "testServer",
      });

      expect(error.toolName).toBe("testTool");
      expect(error.serverId).toBe("testServer");
    });
  });

  describe("toJSON", () => {
    it("should serialize to structured format", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_NOT_FOUND,
        message: "Tool not found",
        toolName: "testTool",
        context: { available: ["tool1", "tool2"] },
      });

      const json = error.toJSON();

      expect(json).toHaveProperty("code", ERROR_CODES.TOOL_NOT_FOUND);
      expect(json).toHaveProperty("message", "Tool not found");
      expect(json).toHaveProperty("category");
      expect(json).toHaveProperty("severity");
      expect(json).toHaveProperty("retriable");
      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("toolName", "testTool");
      expect(json).toHaveProperty("context");
    });

    it("should include all optional fields when present", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_AUTH_FAILED,
        message: "Auth failed",
        provider: "openai",
        httpStatusCode: 401,
        serverId: "server1",
      });

      const json = error.toJSON();

      expect(json.provider).toBe("openai");
      expect(json.httpStatusCode).toBe(401);
      expect(json.serverId).toBe("server1");
    });
  });

  describe("getFormattedMessage", () => {
    it("should format message with error code", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.TOOL_NOT_FOUND,
        message: "Tool not found",
      });

      const formatted = error.getFormattedMessage();
      expect(formatted).toContain("[TOOL_NOT_FOUND]");
      expect(formatted).toContain("Tool not found");
    });

    it("should include provider in formatted message", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_AUTH_FAILED,
        message: "Auth failed",
        provider: "openai",
      });

      const formatted = error.getFormattedMessage();
      expect(formatted).toContain("[openai]");
      expect(formatted).toContain("[PROVIDER_AUTH_FAILED]");
    });

    it("should include severity for critical and high errors", () => {
      const criticalError = new NeuroLinkError({
        code: ERROR_CODES.MEMORY_EXHAUSTED,
        message: "Memory exhausted",
      });

      const formatted = criticalError.getFormattedMessage();
      expect(formatted).toContain("[CRITICAL]");
    });
  });

  describe("shouldRetry", () => {
    it("should return true for retriable errors", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.NETWORK_TIMEOUT,
        message: "Timeout",
      });

      expect(error.shouldRetry()).toBe(true);
    });

    it("should return false for non-retriable errors", () => {
      const error = new NeuroLinkError({
        code: ERROR_CODES.VALIDATION_INVALID_PARAMETERS,
        message: "Invalid params",
      });

      expect(error.shouldRetry()).toBe(false);
    });
  });
});

describe("ErrorFactory", () => {
  describe("toolNotFound", () => {
    it("should create tool not found error", () => {
      const error = ErrorFactory.toolNotFound("testTool", ["tool1", "tool2"]);

      expect(error.code).toBe(ERROR_CODES.TOOL_NOT_FOUND);
      expect(error.message).toContain("testTool");
      expect(error.toolName).toBe("testTool");
      expect(error.context.availableTools).toEqual(["tool1", "tool2"]);
    });
  });

  describe("toolExecutionFailed", () => {
    it("should create tool execution failed error", () => {
      const originalError = new Error("Execution failed");
      const error = ErrorFactory.toolExecutionFailed(
        "testTool",
        originalError,
        "server1",
      );

      expect(error.code).toBe(ERROR_CODES.TOOL_EXECUTION_FAILED);
      expect(error.message).toContain("testTool");
      expect(error.toolName).toBe("testTool");
      expect(error.serverId).toBe("server1");
      expect(error.context.originalMessage).toBe("Execution failed");
    });
  });

  describe("toolTimeout", () => {
    it("should create tool timeout error", () => {
      const error = ErrorFactory.toolTimeout("testTool", 5000);

      expect(error.code).toBe(ERROR_CODES.TOOL_TIMEOUT);
      expect(error.message).toContain("5000ms");
      expect(error.context.timeoutMs).toBe(5000);
    });
  });

  describe("invalidParameters", () => {
    it("should create invalid parameters error for tools", () => {
      const validationError = new Error("Invalid param");
      const error = ErrorFactory.invalidParameters(
        "testTool",
        validationError,
        { param: "value" },
      );

      expect(error.code).toBe(ERROR_CODES.TOOL_PARAMETER_INVALID);
      expect(error.message).toContain("testTool");
      expect(error.context.providedParams).toEqual({ param: "value" });
    });
  });

  describe("networkError", () => {
    it("should create network error", () => {
      const originalError = new Error("Connection failed");
      const error = ErrorFactory.networkError(
        "Connection timeout",
        originalError,
      );

      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(error.message).toContain("Connection timeout");
      expect(error.context.originalMessage).toBe("Connection failed");
    });
  });

  describe("memoryExhausted", () => {
    it("should create memory exhausted error", () => {
      const error = ErrorFactory.memoryExhausted("tool execution", 2048);

      expect(error.code).toBe(ERROR_CODES.MEMORY_EXHAUSTED);
      expect(error.message).toContain("2048MB");
      expect(error.context.memoryUsageMB).toBe(2048);
    });
  });

  describe("providerAuthFailed", () => {
    it("should create provider auth failed error", () => {
      const error = ErrorFactory.providerAuthFailed(
        "openai",
        "Invalid API key",
      );

      expect(error.code).toBe(ERROR_CODES.PROVIDER_AUTH_FAILED);
      expect(error.provider).toBe("openai");
      expect(error.message).toContain("openai");
      expect(error.message).toContain("Invalid API key");
    });
  });

  describe("providerNotFound", () => {
    it("should create provider not found error", () => {
      const error = ErrorFactory.providerNotFound("unknown-provider");

      expect(error.code).toBe(ERROR_CODES.PROVIDER_NOT_FOUND);
      expect(error.provider).toBe("unknown-provider");
      expect(error.message).toContain("unknown-provider");
    });
  });

  describe("providerRateLimit", () => {
    it("should create provider rate limit error", () => {
      const error = ErrorFactory.providerRateLimit("openai", 60);

      expect(error.code).toBe(ERROR_CODES.PROVIDER_RATE_LIMIT);
      expect(error.provider).toBe("openai");
      expect(error.message).toContain("60s");
      expect(error.context.retryAfter).toBe(60);
    });
  });

  describe("mcpServerNotFound", () => {
    it("should create MCP server not found error", () => {
      const error = ErrorFactory.mcpServerNotFound("github");

      expect(error.code).toBe(ERROR_CODES.MCP_SERVER_NOT_FOUND);
      expect(error.serverId).toBe("github");
      expect(error.message).toContain("github");
    });
  });

  describe("mcpServerConnectionFailed", () => {
    it("should create MCP connection failed error", () => {
      const originalError = new Error("Connection refused");
      const error = ErrorFactory.mcpServerConnectionFailed(
        "github",
        originalError,
      );

      expect(error.code).toBe(ERROR_CODES.MCP_SERVER_CONNECTION_FAILED);
      expect(error.serverId).toBe("github");
      expect(error.context.originalMessage).toBe("Connection refused");
    });
  });

  describe("mcpTransportUnsupported", () => {
    it("should create MCP transport unsupported error", () => {
      const error = ErrorFactory.mcpTransportUnsupported("invalid");

      expect(error.code).toBe(ERROR_CODES.MCP_TRANSPORT_UNSUPPORTED);
      expect(error.context.transport).toBe("invalid");
    });
  });

  describe("configInvalid", () => {
    it("should create config invalid error", () => {
      const error = ErrorFactory.configInvalid(
        "Invalid value",
        "apiKey",
        "***",
      );

      expect(error.code).toBe(ERROR_CODES.CONFIG_FIELD_INVALID);
      expect(error.message).toContain("apiKey");
      expect(error.context.field).toBe("apiKey");
      expect(error.context.value).toBe("***");
    });

    it("should create generic config error without field", () => {
      const error = ErrorFactory.configInvalid("Configuration is invalid");

      expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
      expect(error.message).toBe("Configuration is invalid");
    });
  });

  describe("configMissing", () => {
    it("should create config missing error", () => {
      const error = ErrorFactory.configMissing("apiKey");

      expect(error.code).toBe(ERROR_CODES.CONFIG_FIELD_MISSING);
      expect(error.message).toContain("apiKey");
      expect(error.context.field).toBe("apiKey");
    });
  });

  describe("hitlUserRejected", () => {
    it("should create HITL user rejected error", () => {
      const error = ErrorFactory.hitlUserRejected("dangerousTool", "Too risky");

      expect(error.code).toBe(ERROR_CODES.HITL_USER_REJECTED);
      expect(error.toolName).toBe("dangerousTool");
      expect(error.message).toContain("Too risky");
      expect(error.context.reason).toBe("Too risky");
    });
  });

  describe("hitlTimeout", () => {
    it("should create HITL timeout error", () => {
      const error = ErrorFactory.hitlTimeout("confirmTool", 30000);

      expect(error.code).toBe(ERROR_CODES.HITL_TIMEOUT);
      expect(error.toolName).toBe("confirmTool");
      expect(error.context.timeoutMs).toBe(30000);
    });
  });

  describe("validationError", () => {
    it("should create validation error", () => {
      const error = ErrorFactory.validationError(
        "Must be positive",
        "count",
        -5,
      );

      expect(error.code).toBe(ERROR_CODES.VALIDATION_INVALID_PARAMETERS);
      expect(error.message).toContain("count");
      expect(error.context.value).toBe(-5);
    });
  });

  describe("missingRequiredParameter", () => {
    it("should create missing required parameter error", () => {
      const error = ErrorFactory.missingRequiredParameter("apiKey", {
        provider: "openai",
      });

      expect(error.code).toBe(ERROR_CODES.VALIDATION_MISSING_REQUIRED_PARAM);
      expect(error.message).toContain("apiKey");
      expect(error.context.field).toBe("apiKey");
      expect(error.context.provider).toBe("openai");
    });
  });

  describe("authError", () => {
    it("should create auth error with default code", () => {
      const error = ErrorFactory.authError("Invalid credentials");

      expect(error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      expect(error.message).toBe("Invalid credentials");
    });

    it("should create auth error with custom code", () => {
      const error = ErrorFactory.authError(
        "Token expired",
        ERROR_CODES.AUTH_TOKEN_EXPIRED,
      );

      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED);
      expect(error.message).toBe("Token expired");
    });
  });

  describe("systemError", () => {
    it("should create system error", () => {
      const originalError = new Error("System failure");
      const error = ErrorFactory.systemError("Internal error", originalError);

      expect(error.code).toBe(ERROR_CODES.SYSTEM_INTERNAL_ERROR);
      expect(error.message).toBe("Internal error");
      expect(error.context.originalMessage).toBe("System failure");
    });
  });
});

describe("Error Format Consistency", () => {
  it("should have consistent message format across all factory methods", () => {
    const errors = [
      ErrorFactory.toolNotFound("test"),
      ErrorFactory.providerAuthFailed("openai", "test"),
      ErrorFactory.mcpServerNotFound("github"),
      ErrorFactory.configInvalid("test", "field"),
      ErrorFactory.validationError("test", "field"),
    ];

    for (const error of errors) {
      const formatted = error.getFormattedMessage();

      // Should contain error code in brackets
      expect(formatted).toMatch(/\[.*?\]/);

      // Should contain the message
      expect(formatted).toContain(error.message);
    }
  });

  it("should serialize consistently across error types", () => {
    const errors = [
      ErrorFactory.toolNotFound("test"),
      ErrorFactory.providerAuthFailed("openai", "test"),
      ErrorFactory.networkError("test"),
    ];

    for (const error of errors) {
      const json = error.toJSON();

      // All should have standard fields
      expect(json).toHaveProperty("code");
      expect(json).toHaveProperty("message");
      expect(json).toHaveProperty("category");
      expect(json).toHaveProperty("severity");
      expect(json).toHaveProperty("retriable");
      expect(json).toHaveProperty("timestamp");
    }
  });
});
