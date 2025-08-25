/**
 * Invalid Tool Registration Validation Tests
 * Ensures that the registerTools() method correctly validates the structure of
 * incoming tools and rejects any that are malformed.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { NeuroLink } from "../src/lib/neurolink.js";

describe("Invalid Tool Registration", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    neurolink = new NeuroLink();
  });

  test("should throw an error when registering a tool missing the 'name' property", () => {
    const invalidTool = {
      // name property is missing
      tool: {
        description: "A tool without a name.",
        execute: async () => "This should not run.",
      },
    };

    // Vitest's `toThrowError` expects a function that will throw
    // @ts-expect-error - We are intentionally passing an invalid tool shape to test validation.
    const registrationAttempt = () => neurolink.registerTools([invalidTool]);

    // Assert that the function throws an error, and the message is informative
    expect(registrationAttempt).toThrowError(/invalid tool name/i);
  });

  test("should throw an error when registering a tool missing the 'execute' function", () => {
    const invalidTool = {
      name: "invalidTool",
      tool: {
        name: "invalidTool",
        description: "A tool without an execute function.",
        // execute function is missing
      },
    };

    const registrationAttempt = () =>
      neurolink.registerTools([invalidTool as any]);

    expect(registrationAttempt).toThrowError(/must have an execute method/i);
  });

  test("should throw an error when the tool's 'name' is not a string", () => {
    const invalidTool = {
      name: 12345, // Invalid name type
      tool: {
        name: 12345,
        description: "A tool with a non-string name.",
        execute: async () => "This should not run.",
      },
    };

    // @ts-expect-error - We are intentionally passing an invalid tool shape to test validation.
    const registrationAttempt = () => neurolink.registerTools([invalidTool]);

    expect(registrationAttempt).toThrowError(/invalid tool name/i);
  });

  test("should throw an error when the 'execute' property is not a function", () => {
    const invalidTool = {
      name: "invalidTool",
      tool: {
        name: "invalidTool",
        description: "A tool with a non-function execute property.",
        execute: "not-a-function", // Invalid execute type
      },
    };

    // @ts-expect-error - We are intentionally passing an invalid tool shape to test validation.
    const registrationAttempt = () => neurolink.registerTools([invalidTool]);

    expect(registrationAttempt).toThrowError(/must have an execute method/i);
  });
});
