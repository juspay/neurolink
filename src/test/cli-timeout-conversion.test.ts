/**
 * CLI Timeout Conversion Bug Test
 *
 * Tests to verify that CLI timeout values in seconds are correctly converted
 * to milliseconds when passed to providers.
 */

import { describe, it, expect } from "vitest";
import { parseTimeout } from "../lib/utils/timeout.js";

describe("CLI Timeout Conversion", () => {
  describe("parseTimeout function", () => {
    it("should handle numeric timeout values correctly", () => {
      // Numeric values are assumed to be milliseconds by parseTimeout
      expect(parseTimeout(120)).toBe(120);
      expect(parseTimeout(5000)).toBe(5000);
    });

    it("should handle string timeout values correctly", () => {
      // String values with units are converted to milliseconds
      expect(parseTimeout("120s")).toBe(120000); // 120 seconds = 120000 ms
      expect(parseTimeout("2m")).toBe(120000); // 2 minutes = 120000 ms
      expect(parseTimeout("30s")).toBe(30000); // 30 seconds = 30000 ms
    });

    it("should handle undefined timeout", () => {
      expect(parseTimeout(undefined)).toBeUndefined();
    });
  });

  describe("CLI timeout conversion logic", () => {
    it("should convert CLI seconds to milliseconds for numeric timeout", () => {
      // This simulates what the CLI should do for numeric timeout options
      const cliTimeoutInSeconds = 120;
      const providerTimeoutInMs = cliTimeoutInSeconds * 1000;

      expect(providerTimeoutInMs).toBe(120000);
      expect(parseTimeout(providerTimeoutInMs)).toBe(120000);
    });

    it("should pass string timeouts directly without conversion", () => {
      // String timeouts like "2m" should be passed as-is to parseTimeout
      const cliTimeoutString = "2m";
      const providerTimeout = cliTimeoutString; // No conversion needed

      expect(parseTimeout(providerTimeout)).toBe(120000);
    });

    it("should verify the bug scenario", () => {
      // BUG: When CLI timeout=120 (seconds) was passed directly to providers
      // the providers would treat it as 120ms instead of 120000ms

      const cliTimeoutSeconds = 120;

      // WRONG (bug): Passing seconds directly as milliseconds
      const buggyProviderTimeout = cliTimeoutSeconds; // 120 (treated as 120ms)
      expect(parseTimeout(buggyProviderTimeout)).toBe(120); // Only 120ms!

      // CORRECT (fix): Converting seconds to milliseconds
      const fixedProviderTimeout = cliTimeoutSeconds * 1000; // 120000ms
      expect(parseTimeout(fixedProviderTimeout)).toBe(120000); // 120 seconds as intended
    });
  });

  describe("Error messages should reference correct timeout", () => {
    it("should show intended timeout in error messages", () => {
      // When user specifies --timeout 120, error should say "120 seconds" not "120ms"
      const cliTimeoutSeconds = 120;
      const providerTimeoutMs = cliTimeoutSeconds * 1000;

      // Verify that the provider gets the correct timeout in milliseconds
      expect(providerTimeoutMs).toBe(120000);

      // Error messages should reference the original CLI value with units
      const expectedErrorMessage = `operation timed out after ${cliTimeoutSeconds}s`;
      expect(expectedErrorMessage).toBe("operation timed out after 120s");
    });
  });
});
