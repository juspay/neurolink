/**
 * PII Detection Processor Unit Tests
 */
import { describe, expect, it } from "vitest";
import {
  createPIIDetectionProcessor,
  piiDetectionProcessor,
} from "../../../../src/lib/processors/input/piiDetectionProcessor.js";
import type {
  InputProcessorData,
  PIIDetectionConfig,
  ProcessorMetadata,
} from "../../../../src/lib/types/ioProcessor.js";

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

// Helper to create input data (with no messages for simpler testing)
function createInputData(text: string): InputProcessorData {
  return {
    options: { input: { text } },
    messages: [],
    text,
    metadata: createMetadata(),
  };
}

describe("createPIIDetectionProcessor", () => {
  describe("processor metadata", () => {
    it("should have correct id and name", () => {
      const processor = createPIIDetectionProcessor();

      expect(processor.id).toBe("pii-detection");
      expect(processor.name).toBe("PII Detection");
      expect(processor.description).toContain("identifiable information");
      expect(processor.priority).toBe(85);
    });
  });

  describe("email detection", () => {
    it("should detect email addresses", async () => {
      const processor = createPIIDetectionProcessor({ detectTypes: ["email"] });
      const data = createInputData(
        "Contact me at john.doe@example.com for details.",
      );

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("email");
    });

    it("should detect multiple email addresses", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "warn",
      });
      const data = createInputData("Contact john@example.com or jane@test.org");

      const result = await processor.process(data);

      expect(result.issues?.length).toBe(1);
      expect(result.issues?.[0].message).toContain("occurrence");
      expect(result.metadata?.piiDetected).toBe(true);
    });
  });

  describe("phone detection", () => {
    it("should detect US phone numbers", async () => {
      const processor = createPIIDetectionProcessor({ detectTypes: ["phone"] });
      const data = createInputData("Call me at 555-123-4567");

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("phone");
    });

    it("should detect formatted phone numbers", async () => {
      const processor = createPIIDetectionProcessor({ detectTypes: ["phone"] });
      const data = createInputData("Phone: (555) 123-4567 or +1 555 123 4567");

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
    });
  });

  describe("SSN detection", () => {
    it("should detect SSN format", async () => {
      const processor = createPIIDetectionProcessor({ detectTypes: ["ssn"] });
      const data = createInputData("My SSN is 123-45-6789");

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("ssn");
    });

    it("should detect SSN without dashes", async () => {
      const processor = createPIIDetectionProcessor({ detectTypes: ["ssn"] });
      const data = createInputData("SSN: 123 45 6789");

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
    });
  });

  describe("credit card detection", () => {
    it("should detect credit card numbers", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["credit_card"],
      });
      const data = createInputData("Card: 4111-1111-1111-1111");

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("credit_card");
    });
  });

  describe("abort action", () => {
    it("should abort when PII is detected with abort action", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "abort",
      });
      const data = createInputData("Email: test@example.com");

      const result = await processor.process(data);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("PII detected");
      expect(result.feedback).toContain("blocked for security");
      expect(result.issues?.[0].severity).toBe("critical");
    });
  });

  describe("redact action", () => {
    it("should redact PII in text", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "redact",
        redactionText: "[REDACTED]",
      });
      const data = createInputData("Contact john@example.com for help.");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toContain("[REDACTED]");
      expect(result.data?.text).not.toContain("john@example.com");
      expect(result.metadata?.piiRedacted).toBe(true);
    });

    it("should redact PII in messages", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "redact",
        redactionText: "***",
      });
      const data: InputProcessorData = {
        options: { input: { text: "" } },
        messages: [
          { id: "1", role: "user", content: "My email is user@test.com" },
        ],
        text: "",
        metadata: createMetadata(),
      };

      const result = await processor.process(data);

      expect(result.data?.messages[0].content).toContain("***");
      expect(result.metadata?.piiRedacted).toBe(true);
    });

    it("should redact multiple occurrences", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "redact",
        redactionText: "[EMAIL]",
      });
      const data = createInputData("Email a@b.com and c@d.com");

      const result = await processor.process(data);

      expect(result.data?.text).toContain("[EMAIL]");
      expect(result.metadata?.piiRedacted).toBe(true);
      expect(result.metadata?.redactionCount).toBeGreaterThan(0);
    });
  });

  describe("warn action", () => {
    it("should continue with warnings for warn action", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "warn",
      });
      const data = createInputData("Email: test@example.com");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("Email: test@example.com"); // Unchanged
      expect(result.metadata?.piiWarned).toBe(true);
      expect(result.issues?.length).toBeGreaterThan(0);
      expect(result.issues?.[0].severity).toBe("warning");
    });
  });

  describe("no PII", () => {
    it("should continue without issues when no PII found", async () => {
      const processor = createPIIDetectionProcessor();
      const data = createInputData("Hello, how are you today?");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.metadata?.piiDetected).toBe(false);
      expect(result.metadata?.piiScanned).toBe(true);
      expect(result.issues).toBeUndefined();
    });

    it("should handle empty text", async () => {
      const processor = createPIIDetectionProcessor();
      const data = createInputData("");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.metadata?.piiScanned).toBe(true);
    });
  });

  describe("custom patterns", () => {
    it("should detect custom patterns", async () => {
      const processor = createPIIDetectionProcessor({
        customPatterns: [{ name: "employee_id", pattern: /EMP-\d{6}/g }],
        action: "warn",
      });
      const data = createInputData("Employee ID: EMP-123456");

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("employee_id");
    });
  });

  describe("allow list", () => {
    it("should skip detection for allowed PII types", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email", "phone"],
        allowList: [{ type: "email" }],
      });
      const data = createInputData(
        "Email: test@example.com, Phone: 555-123-4567",
      );

      const result = await processor.process(data);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).not.toContain("email");
      expect(result.metadata?.piiTypes).toContain("phone");
    });
  });

  describe("validateConfig", () => {
    it("should validate valid config", () => {
      const processor = createPIIDetectionProcessor();

      const result = processor.validateConfig!({
        detectTypes: ["email", "phone"],
        action: "redact",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid action", () => {
      const processor = createPIIDetectionProcessor();

      const result = processor.validateConfig!({
        action: "invalid",
      } as unknown as PIIDetectionConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid action");
    });

    it("should reject invalid PII type", () => {
      const processor = createPIIDetectionProcessor();

      const result = processor.validateConfig!({
        detectTypes: ["invalid_type"],
      } as unknown as PIIDetectionConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid PII type");
    });

    it("should reject invalid custom patterns", () => {
      const processor = createPIIDetectionProcessor();

      const result = processor.validateConfig!({
        customPatterns: [{ name: "" }],
      } as unknown as PIIDetectionConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Custom patterns must have");
    });
  });
});

describe("piiDetectionProcessor (pre-configured)", () => {
  it("should be a valid input processor", () => {
    expect(piiDetectionProcessor.id).toBe("pii-detection");
    expect(piiDetectionProcessor.process).toBeDefined();
  });

  it("should use default configuration", async () => {
    const data = createInputData("Test with email@example.com and 123-45-6789");

    const result = await piiDetectionProcessor.process(data);

    // Default action is "warn"
    expect(result.action).toBe("continue");
    expect(result.metadata?.piiDetected).toBe(true);
  });
});
