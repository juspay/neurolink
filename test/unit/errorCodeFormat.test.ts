import { describe, it, expect } from "vitest";
import {
  ERROR_CODES,
  ERROR_CODE_METADATA,
  type ErrorCode,
} from "../../src/lib/constants/errorCodes.js";

describe("Error Code Format Validation", () => {
  describe("Code Format Standards", () => {
    it("should have consistent naming convention across all codes", () => {
      const codes = Object.values(ERROR_CODES);

      for (const code of codes) {
        // Should be UPPERCASE_WITH_UNDERSCORES
        expect(code).toMatch(/^[A-Z][A-Z_]*[A-Z]$/);

        // Should not have double underscores
        expect(code).not.toMatch(/__/);

        // Should not start or end with underscore
        expect(code).not.toMatch(/^_/);
        expect(code).not.toMatch(/_$/);

        // Should have at least one underscore (category separator)
        expect(code).toMatch(/_/);
      }
    });

    it("should have category prefixes matching the code structure", () => {
      const categoryPrefixes = [
        "TOOL",
        "PROVIDER",
        "NETWORK",
        "AUTH",
        "VALIDATION",
        "CONFIG",
        "MCP",
        "HITL",
        "SYSTEM",
        "MEMORY",
      ];

      const codes = Object.values(ERROR_CODES);
      const unmatchedCodes = codes.filter((code) => {
        // Skip generic codes
        if (code === "UNKNOWN_ERROR" || code === "NOT_IMPLEMENTED") {
          return false;
        }

        return !categoryPrefixes.some((prefix) =>
          code.startsWith(prefix + "_"),
        );
      });

      expect(unmatchedCodes).toEqual([]);
    });

    it("should have descriptive error code names", () => {
      const codes = Object.values(ERROR_CODES);

      for (const code of codes) {
        const parts = code.split("_");

        // Should have at least 2 parts (category + description)
        expect(parts.length).toBeGreaterThanOrEqual(2);

        // Each part should be meaningful (not too short)
        for (const part of parts) {
          expect(part.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("Metadata Completeness", () => {
    it("should have metadata for every error code", () => {
      const codes = Object.values(ERROR_CODES);

      for (const code of codes) {
        const metadata = ERROR_CODE_METADATA[code as ErrorCode];
        expect(metadata).toBeDefined();
        expect(metadata.code).toBe(code);
      }
    });

    it("should have valid category values", () => {
      const validCategories = [
        "validation",
        "execution",
        "timeout",
        "network",
        "resource",
        "permission",
        "configuration",
        "system",
      ];

      for (const metadata of Object.values(ERROR_CODE_METADATA)) {
        expect(validCategories).toContain(metadata.category);
      }
    });

    it("should have valid severity values", () => {
      const validSeverities = ["low", "medium", "high", "critical"];

      for (const metadata of Object.values(ERROR_CODE_METADATA)) {
        expect(validSeverities).toContain(metadata.severity);
      }
    });

    it("should have boolean retriable flag", () => {
      for (const metadata of Object.values(ERROR_CODE_METADATA)) {
        expect(typeof metadata.retriable).toBe("boolean");
      }
    });

    it("should have valid HTTP status codes when present", () => {
      for (const metadata of Object.values(ERROR_CODE_METADATA)) {
        if (metadata.httpStatusCode !== undefined) {
          // Valid HTTP status codes are 100-599
          expect(metadata.httpStatusCode).toBeGreaterThanOrEqual(100);
          expect(metadata.httpStatusCode).toBeLessThan(600);

          // Common valid status codes
          const validStatuses = [
            200, 201, 204, 400, 401, 403, 404, 408, 409, 422, 429, 500, 501,
            502, 503, 504,
          ];
          expect(validStatuses).toContain(metadata.httpStatusCode);
        }
      }
    });
  });

  describe("Error Code Consistency", () => {
    it("should have consistent retriable flags for similar errors", () => {
      // Network and timeout errors should be retriable
      const networkCodes = Object.entries(ERROR_CODES)
        .filter(([key]) => key.startsWith("NETWORK_"))
        .map(([, value]) => value);

      for (const code of networkCodes) {
        const metadata = ERROR_CODE_METADATA[code as ErrorCode];
        expect(metadata.retriable).toBe(true);
      }

      // Validation errors should not be retriable
      const validationCodes = Object.entries(ERROR_CODES)
        .filter(([key]) => key.startsWith("VALIDATION_"))
        .map(([, value]) => value);

      for (const code of validationCodes) {
        const metadata = ERROR_CODE_METADATA[code as ErrorCode];
        expect(metadata.retriable).toBe(false);
      }

      // Auth errors should not be retriable (fix won't happen automatically)
      const authCodes = Object.entries(ERROR_CODES)
        .filter(([key]) => key.startsWith("AUTH_"))
        .map(([, value]) => value);

      for (const code of authCodes) {
        const metadata = ERROR_CODE_METADATA[code as ErrorCode];
        expect(metadata.retriable).toBe(false);
      }
    });

    it("should have appropriate severity for critical errors", () => {
      const criticalErrorPatterns = [
        "MEMORY_EXHAUSTED",
        "PROVIDER_AUTH_FAILED",
        "AUTH_INVALID_CREDENTIALS",
        "SYSTEM_INTERNAL_ERROR",
      ];

      for (const pattern of criticalErrorPatterns) {
        const code = ERROR_CODES[pattern as keyof typeof ERROR_CODES];
        if (code) {
          const metadata = ERROR_CODE_METADATA[code as ErrorCode];
          expect(metadata.severity).toMatch(/^(critical|high)$/);
        }
      }
    });

    it("should have consistent HTTP codes for similar error types", () => {
      // All auth errors should have 401 or 403
      const authCodes = Object.entries(ERROR_CODES)
        .filter(([key]) => key.startsWith("AUTH_"))
        .map(([, value]) => value);

      for (const code of authCodes) {
        const metadata = ERROR_CODE_METADATA[code as ErrorCode];
        if (metadata.httpStatusCode) {
          expect([401, 403]).toContain(metadata.httpStatusCode);
        }
      }

      // All validation errors should have 400
      const validationCodes = Object.entries(ERROR_CODES)
        .filter(([key]) => key.startsWith("VALIDATION_"))
        .map(([, value]) => value);

      for (const code of validationCodes) {
        const metadata = ERROR_CODE_METADATA[code as ErrorCode];
        if (metadata.httpStatusCode) {
          expect(metadata.httpStatusCode).toBe(400);
        }
      }
    });
  });

  describe("Coverage Completeness", () => {
    it("should cover all major error scenarios", () => {
      const requiredScenarios = [
        // Tool scenarios
        "TOOL_NOT_FOUND",
        "TOOL_EXECUTION_FAILED",
        "TOOL_TIMEOUT",

        // Provider scenarios
        "PROVIDER_AUTH_FAILED",
        "PROVIDER_RATE_LIMIT",
        "PROVIDER_NOT_FOUND",

        // Network scenarios
        "NETWORK_ERROR",
        "NETWORK_TIMEOUT",

        // Auth scenarios
        "AUTH_INVALID_CREDENTIALS",
        "AUTH_TOKEN_EXPIRED",

        // Validation scenarios
        "VALIDATION_INVALID_PARAMETERS",
        "VALIDATION_MISSING_REQUIRED_PARAM",

        // Config scenarios
        "CONFIG_INVALID",
        "CONFIG_MISSING",

        // MCP scenarios
        "MCP_SERVER_NOT_FOUND",
        "MCP_SERVER_CONNECTION_FAILED",

        // HITL scenarios
        "HITL_USER_REJECTED",
        "HITL_TIMEOUT",

        // System scenarios
        "SYSTEM_INTERNAL_ERROR",

        // Memory scenarios
        "MEMORY_EXHAUSTED",
      ];

      const codes = Object.values(ERROR_CODES);

      for (const scenario of requiredScenarios) {
        expect(codes).toContain(scenario);
      }
    });

    it("should have balanced distribution across categories", () => {
      const categoryCounts: Record<string, number> = {};

      for (const code of Object.values(ERROR_CODES)) {
        const category = code.split("_")[0];
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }

      // Should have at least 2 error codes per major category
      const majorCategories = [
        "TOOL",
        "PROVIDER",
        "NETWORK",
        "AUTH",
        "VALIDATION",
        "CONFIG",
        "MCP",
        "SYSTEM",
        "MEMORY",
      ];

      for (const category of majorCategories) {
        expect(categoryCounts[category]).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Error Code Uniqueness", () => {
    it("should not have duplicate error codes", () => {
      const codes = Object.values(ERROR_CODES);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });

    it("should not have similar codes that could be confused", () => {
      const codes = Object.values(ERROR_CODES);

      // Check for codes that differ only by underscores or minor variations
      for (let i = 0; i < codes.length; i++) {
        for (let j = i + 1; j < codes.length; j++) {
          const code1 = codes[i];
          const code2 = codes[j];

          // Remove underscores and compare
          const normalized1 = code1.replace(/_/g, "").toLowerCase();
          const normalized2 = code2.replace(/_/g, "").toLowerCase();

          // Should not be too similar (Levenshtein distance > 2)
          const distance = levenshteinDistance(normalized1, normalized2);
          expect(distance).toBeGreaterThan(2);
        }
      }
    });

    it("should have unique constant names", () => {
      const constantNames = Object.keys(ERROR_CODES);
      const uniqueNames = new Set(constantNames);

      expect(constantNames.length).toBe(uniqueNames.size);
    });
  });
});

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
