/**
 * TripwireEvaluator Unit Tests
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  commonTripwires,
  createDefaultTripwireEvaluator,
  emptyResponseTripwire,
  highLatencyTripwire,
  inputTooLongTripwire,
  maxTokensTripwire,
  repetitionLoopTripwire,
  responseTooLongTripwire,
  TripwireEvaluator,
  tooManyMessagesTripwire,
} from "../../../src/lib/processors/tripwire.js";
import type {
  InputProcessorData,
  OutputProcessorData,
  ProcessorMetadata,
  TripwireConfig,
} from "../../../src/lib/types/processorTypes.js";

// Helper to create valid metadata
function createMetadata(
  overrides: Partial<ProcessorMetadata> = {},
): ProcessorMetadata {
  return {
    requestId: "test-request-id",
    timestamp: Date.now(),
    custom: {},
    issues: [],
    processorTrace: [],
    ...overrides,
  };
}

// Helper to create input data
function createInputData(
  overrides: Partial<InputProcessorData> = {},
): InputProcessorData {
  return {
    options: { input: { text: "Test prompt" } },
    messages: [{ id: "msg-1", role: "user", content: "Hello" }],
    text: "Hello",
    metadata: createMetadata(),
    ...overrides,
  };
}

// Helper to create output data
function createOutputData(
  overrides: Partial<OutputProcessorData> = {},
): OutputProcessorData {
  return {
    input: createInputData(),
    result: {
      content: "Response text",
      provider: "openai",
      model: "gpt-4o",
    },
    responseText: "Response text",
    metadata: createMetadata(),
    ...overrides,
  };
}

describe("TripwireEvaluator", () => {
  let evaluator: TripwireEvaluator;

  beforeEach(() => {
    evaluator = new TripwireEvaluator();
  });

  describe("constructor", () => {
    it("should create empty evaluator by default", () => {
      const empty = new TripwireEvaluator();
      expect(empty.count).toBe(0);
    });

    it("should accept initial tripwires", () => {
      const tripwire: TripwireConfig = {
        id: "initial",
        name: "Initial",
        condition: () => false,
        action: "warn",
        message: "Test",
        severity: "warning",
      };

      const withInitial = new TripwireEvaluator([tripwire]);

      expect(withInitial.count).toBe(1);
      expect(withInitial.has("initial")).toBe(true);
    });
  });

  describe("register", () => {
    it("should register a new tripwire", () => {
      const tripwire: TripwireConfig = {
        id: "new-tripwire",
        name: "New Tripwire",
        condition: () => false,
        action: "abort",
        message: "Triggered",
        severity: "error",
      };

      evaluator.register(tripwire);

      expect(evaluator.has("new-tripwire")).toBe(true);
      expect(evaluator.get("new-tripwire")).toEqual(tripwire);
    });

    it("should replace existing tripwire with same ID", () => {
      const original: TripwireConfig = {
        id: "replaceable",
        name: "Original",
        condition: () => false,
        action: "warn",
        message: "Original",
        severity: "warning",
      };

      const replacement: TripwireConfig = {
        id: "replaceable",
        name: "Replacement",
        condition: () => true,
        action: "abort",
        message: "Replaced",
        severity: "error",
      };

      evaluator.register(original);
      evaluator.register(replacement);

      expect(evaluator.count).toBe(1);
      expect(evaluator.get("replaceable")?.name).toBe("Replacement");
    });
  });

  describe("registerAll", () => {
    it("should register multiple tripwires", () => {
      const tripwires: TripwireConfig[] = [
        {
          id: "trip1",
          name: "Trip 1",
          condition: () => false,
          action: "warn",
          message: "Test",
          severity: "info",
        },
        {
          id: "trip2",
          name: "Trip 2",
          condition: () => false,
          action: "abort",
          message: "Test",
          severity: "error",
        },
      ];

      evaluator.registerAll(tripwires);

      expect(evaluator.count).toBe(2);
      expect(evaluator.has("trip1")).toBe(true);
      expect(evaluator.has("trip2")).toBe(true);
    });
  });

  describe("unregister", () => {
    it("should remove registered tripwire", () => {
      evaluator.register({
        id: "removable",
        name: "Removable",
        condition: () => false,
        action: "warn",
        message: "Test",
        severity: "warning",
      });

      const result = evaluator.unregister("removable");

      expect(result).toBe(true);
      expect(evaluator.has("removable")).toBe(false);
    });

    it("should return false for non-existent tripwire", () => {
      const result = evaluator.unregister("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("evaluate", () => {
    it("should return not triggered when no tripwires match", () => {
      evaluator.register({
        id: "no-match",
        name: "No Match",
        condition: () => false,
        action: "abort",
        message: "Should not trigger",
        severity: "error",
      });

      const result = evaluator.evaluate(createOutputData());

      expect(result.triggered).toBe(false);
      expect(result.tripwire).toBeUndefined();
    });

    it("should trigger on matching condition", () => {
      evaluator.register({
        id: "always-trigger",
        name: "Always Trigger",
        condition: () => true,
        action: "abort",
        message: "Always triggers",
        severity: "critical",
      });

      const result = evaluator.evaluate(createOutputData());

      expect(result.triggered).toBe(true);
      expect(result.tripwire?.id).toBe("always-trigger");
      expect(result.action).toBe("abort");
      expect(result.feedback).toBe("Always triggers");
    });

    it("should return continue action for warn tripwires", () => {
      evaluator.register({
        id: "warn-only",
        name: "Warn Only",
        condition: () => true,
        action: "warn",
        message: "Warning only",
        severity: "warning",
      });

      const result = evaluator.evaluate(createOutputData());

      expect(result.triggered).toBe(true);
      expect(result.action).toBe("continue");
    });

    it("should stop at first abort tripwire", () => {
      evaluator.register({
        id: "first-abort",
        name: "First",
        condition: () => true,
        action: "abort",
        message: "First abort",
        severity: "error",
      });
      evaluator.register({
        id: "second-abort",
        name: "Second",
        condition: () => true,
        action: "abort",
        message: "Second abort",
        severity: "error",
      });

      const result = evaluator.evaluate(createOutputData());

      expect(result.tripwire?.id).toBe("first-abort");
    });

    it("should handle condition errors gracefully", () => {
      evaluator.register({
        id: "error-tripwire",
        name: "Error",
        condition: () => {
          throw new Error("Condition failed");
        },
        action: "abort",
        message: "Error",
        severity: "error",
      });

      // Should not throw
      const result = evaluator.evaluate(createOutputData());

      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateAll", () => {
    it("should return all triggered tripwires", () => {
      evaluator.register({
        id: "trigger1",
        name: "Trigger 1",
        condition: () => true,
        action: "warn",
        message: "First",
        severity: "warning",
      });
      evaluator.register({
        id: "trigger2",
        name: "Trigger 2",
        condition: () => true,
        action: "abort",
        message: "Second",
        severity: "error",
      });
      evaluator.register({
        id: "no-trigger",
        name: "No Trigger",
        condition: () => false,
        action: "abort",
        message: "Not triggered",
        severity: "error",
      });

      const results = evaluator.evaluateAll(createOutputData());

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.tripwire?.id === "trigger1")).toBeDefined();
      expect(results.find((r) => r.tripwire?.id === "trigger2")).toBeDefined();
    });

    it("should return empty array when no tripwires trigger", () => {
      evaluator.register({
        id: "no-match",
        name: "No Match",
        condition: () => false,
        action: "abort",
        message: "Test",
        severity: "error",
      });

      const results = evaluator.evaluateAll(createOutputData());

      expect(results).toHaveLength(0);
    });
  });

  describe("list", () => {
    it("should return all registered tripwires", () => {
      const trip1: TripwireConfig = {
        id: "t1",
        name: "T1",
        condition: () => false,
        action: "warn",
        message: "Test",
        severity: "info",
      };
      const trip2: TripwireConfig = {
        id: "t2",
        name: "T2",
        condition: () => false,
        action: "abort",
        message: "Test",
        severity: "error",
      };

      evaluator.register(trip1);
      evaluator.register(trip2);

      const list = evaluator.list();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual(trip1);
      expect(list).toContainEqual(trip2);
    });

    it("should return a copy, not the original array", () => {
      evaluator.register({
        id: "original",
        name: "Original",
        condition: () => false,
        action: "warn",
        message: "Test",
        severity: "info",
      });

      const list = evaluator.list();
      list.push({
        id: "injected",
        name: "Injected",
        condition: () => false,
        action: "abort",
        message: "Test",
        severity: "error",
      });

      expect(evaluator.count).toBe(1); // Original unchanged
    });
  });

  describe("get", () => {
    it("should return tripwire by ID", () => {
      const tripwire: TripwireConfig = {
        id: "findable",
        name: "Findable",
        condition: () => false,
        action: "warn",
        message: "Found",
        severity: "info",
      };
      evaluator.register(tripwire);

      const found = evaluator.get("findable");

      expect(found).toEqual(tripwire);
    });

    it("should return undefined for non-existent ID", () => {
      const found = evaluator.get("nonexistent");

      expect(found).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should remove all tripwires", () => {
      evaluator.register({
        id: "t1",
        name: "T1",
        condition: () => false,
        action: "warn",
        message: "Test",
        severity: "info",
      });
      evaluator.register({
        id: "t2",
        name: "T2",
        condition: () => false,
        action: "abort",
        message: "Test",
        severity: "error",
      });

      evaluator.clear();

      expect(evaluator.count).toBe(0);
    });
  });
});

describe("Common Tripwires", () => {
  describe("emptyResponseTripwire", () => {
    it("should trigger on empty response", () => {
      const data = createOutputData({ responseText: "" });

      expect(emptyResponseTripwire.condition(data)).toBe(true);
    });

    it("should trigger on whitespace-only response", () => {
      const data = createOutputData({ responseText: "   \n\t  " });

      expect(emptyResponseTripwire.condition(data)).toBe(true);
    });

    it("should not trigger on valid response", () => {
      const data = createOutputData({ responseText: "Hello, world!" });

      expect(emptyResponseTripwire.condition(data)).toBe(false);
    });

    it("should not trigger on input data (no responseText)", () => {
      const data = createInputData();

      expect(emptyResponseTripwire.condition(data)).toBe(false);
    });
  });

  describe("maxTokensTripwire", () => {
    it("should trigger when tokens exceed limit", () => {
      const data = createOutputData();
      data.result.usage = { input: 50000, output: 60000, total: 110000 };

      expect(maxTokensTripwire.condition(data)).toBe(true);
    });

    it("should not trigger when tokens are within limit", () => {
      const data = createOutputData();
      data.result.usage = { input: 1000, output: 500, total: 1500 };

      expect(maxTokensTripwire.condition(data)).toBe(false);
    });

    it("should not trigger when no usage data", () => {
      const data = createOutputData();
      delete data.result.usage;

      expect(maxTokensTripwire.condition(data)).toBe(false);
    });
  });

  describe("repetitionLoopTripwire", () => {
    it("should trigger on highly repetitive content", () => {
      // Create text with less than 30% unique words
      const repeatedWord = "hello ";
      const data = createOutputData({
        responseText: repeatedWord.repeat(100),
      });

      expect(repetitionLoopTripwire.condition(data)).toBe(true);
    });

    it("should not trigger on varied content", () => {
      const data = createOutputData({
        responseText:
          "This is a varied response with many different words that are not repetitive at all and should pass the uniqueness test.",
      });

      expect(repetitionLoopTripwire.condition(data)).toBe(false);
    });

    it("should not trigger on short content", () => {
      const data = createOutputData({
        responseText: "Short response",
      });

      expect(repetitionLoopTripwire.condition(data)).toBe(false);
    });
  });

  describe("inputTooLongTripwire", () => {
    it("should trigger when input exceeds limit", () => {
      const longText = "x".repeat(60000);
      const data = createInputData({ text: longText });

      expect(inputTooLongTripwire.condition(data)).toBe(true);
    });

    it("should not trigger when input is within limit", () => {
      const data = createInputData({ text: "Normal length input" });

      expect(inputTooLongTripwire.condition(data)).toBe(false);
    });
  });

  describe("tooManyMessagesTripwire", () => {
    it("should trigger when message count exceeds limit", () => {
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: "user" as const,
        content: `Message ${i}`,
      }));
      const data = createInputData({ messages });

      expect(tooManyMessagesTripwire.condition(data)).toBe(true);
    });

    it("should not trigger when message count is within limit", () => {
      const data = createInputData({
        messages: [{ id: "1", role: "user", content: "Hello" }],
      });

      expect(tooManyMessagesTripwire.condition(data)).toBe(false);
    });
  });

  describe("responseTooLongTripwire", () => {
    it("should trigger when response exceeds limit", () => {
      const longResponse = "x".repeat(150000);
      const data = createOutputData({ responseText: longResponse });

      expect(responseTooLongTripwire.condition(data)).toBe(true);
    });

    it("should not trigger when response is within limit", () => {
      const data = createOutputData({ responseText: "Normal response" });

      expect(responseTooLongTripwire.condition(data)).toBe(false);
    });
  });

  describe("highLatencyTripwire", () => {
    it("should trigger when latency exceeds threshold", () => {
      const data = createOutputData({
        metadata: createMetadata({
          custom: { responseTime: 35000 },
        }),
      });

      expect(highLatencyTripwire.condition(data)).toBe(true);
    });

    it("should not trigger when latency is acceptable", () => {
      const data = createOutputData({
        metadata: createMetadata({
          custom: { responseTime: 5000 },
        }),
      });

      expect(highLatencyTripwire.condition(data)).toBe(false);
    });

    it("should not trigger when no latency data", () => {
      const data = createOutputData();

      expect(highLatencyTripwire.condition(data)).toBe(false);
    });
  });

  describe("commonTripwires array", () => {
    it("should contain all common tripwires", () => {
      expect(commonTripwires).toContain(maxTokensTripwire);
      expect(commonTripwires).toContain(emptyResponseTripwire);
      expect(commonTripwires).toContain(repetitionLoopTripwire);
      expect(commonTripwires).toContain(inputTooLongTripwire);
      expect(commonTripwires).toContain(tooManyMessagesTripwire);
      expect(commonTripwires).toContain(responseTooLongTripwire);
      expect(commonTripwires).toContain(highLatencyTripwire);
    });

    it("should have 7 common tripwires", () => {
      expect(commonTripwires).toHaveLength(7);
    });
  });
});

describe("createDefaultTripwireEvaluator", () => {
  it("should create evaluator with all common tripwires", () => {
    const evaluator = createDefaultTripwireEvaluator();

    expect(evaluator.count).toBe(7);
    expect(evaluator.has("max-tokens")).toBe(true);
    expect(evaluator.has("empty-response")).toBe(true);
    expect(evaluator.has("repetition-loop")).toBe(true);
    expect(evaluator.has("input-too-long")).toBe(true);
    expect(evaluator.has("too-many-messages")).toBe(true);
    expect(evaluator.has("response-too-long")).toBe(true);
    expect(evaluator.has("high-latency")).toBe(true);
  });
});
