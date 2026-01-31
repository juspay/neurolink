/**
 * @file Tests for IOProcessorError types and utilities
 */

import { describe, it, expect } from "vitest";
import {
  IOProcessorErrorCodes,
  ioProcessorErrors,
  isRetryableIOProcessorError,
  isIOProcessorError,
  createProcessorFailedError,
  createPipelineError,
  createRegistryError,
  createTripwireError,
  createValidationError,
  createPresetNotFoundError,
  createProcessorNotFoundError,
  createDuplicateProcessorError,
  createTimeoutError,
  createConfigurationError,
  createAbortError,
  createBatchError,
} from "../../src/lib/processors/errors/IOProcessorError.js";
import { NeuroLinkFeatureError } from "../../src/lib/core/infrastructure/index.js";

describe("IOProcessorError", () => {
  describe("Error Codes", () => {
    it("should have all expected error codes defined", () => {
      expect(IOProcessorErrorCodes.PROCESSOR_FAILED).toBe("PROCESSOR_FAILED");
      expect(IOProcessorErrorCodes.PIPELINE_ERROR).toBe("PIPELINE_ERROR");
      expect(IOProcessorErrorCodes.REGISTRY_ERROR).toBe("REGISTRY_ERROR");
      expect(IOProcessorErrorCodes.TRIPWIRE_ERROR).toBe("TRIPWIRE_ERROR");
      expect(IOProcessorErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(IOProcessorErrorCodes.PRESET_NOT_FOUND).toBe("PRESET_NOT_FOUND");
      expect(IOProcessorErrorCodes.PROCESSOR_NOT_FOUND).toBe(
        "PROCESSOR_NOT_FOUND",
      );
      expect(IOProcessorErrorCodes.DUPLICATE_PROCESSOR).toBe(
        "DUPLICATE_PROCESSOR",
      );
      expect(IOProcessorErrorCodes.TIMEOUT_ERROR).toBe("TIMEOUT_ERROR");
      expect(IOProcessorErrorCodes.CONFIGURATION_ERROR).toBe(
        "CONFIGURATION_ERROR",
      );
      expect(IOProcessorErrorCodes.ABORT_ERROR).toBe("ABORT_ERROR");
      expect(IOProcessorErrorCodes.BATCH_ERROR).toBe("BATCH_ERROR");
    });
  });

  describe("ioProcessorErrors factory", () => {
    it("should create errors with correct feature name", () => {
      const error = ioProcessorErrors.create(
        "PROCESSOR_FAILED",
        "Test error message",
      );
      expect(error.feature).toBe("IOProcessor");
      expect(error.code).toBe("PROCESSOR_FAILED");
      expect(error.message).toBe("Test error message");
    });

    it("should create errors with retryable flag", () => {
      const error = ioProcessorErrors.create(
        "TIMEOUT_ERROR",
        "Timeout occurred",
        { retryable: true },
      );
      expect(error.retryable).toBe(true);
    });

    it("should create errors with details", () => {
      const error = ioProcessorErrors.create(
        "VALIDATION_ERROR",
        "Validation failed",
        { details: { field: "test" } },
      );
      expect(error.details).toEqual({ field: "test" });
    });

    it("should create errors with cause", () => {
      const cause = new Error("Original error");
      const error = ioProcessorErrors.create(
        "PROCESSOR_FAILED",
        "Wrapped error",
        { cause },
      );
      expect(error.cause).toBe(cause);
    });
  });

  describe("isRetryableIOProcessorError", () => {
    it("should return true for timeout errors", () => {
      const error = createTimeoutError("test-processor", 5000);
      expect(isRetryableIOProcessorError(error)).toBe(true);
    });

    it("should return false for processor failed errors", () => {
      const error = createProcessorFailedError("test-processor", "Failed");
      expect(isRetryableIOProcessorError(error)).toBe(false);
    });

    it("should return true if retryable flag is set", () => {
      const error = ioProcessorErrors.create("PROCESSOR_FAILED", "Test error", {
        retryable: true,
      });
      expect(isRetryableIOProcessorError(error)).toBe(true);
    });
  });

  describe("isIOProcessorError", () => {
    it("should return true for IOProcessor errors", () => {
      const error = createProcessorFailedError("test-processor", "Failed");
      expect(isIOProcessorError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      const error = new Error("Regular error");
      expect(isIOProcessorError(error)).toBe(false);
    });

    it("should return false for NeuroLinkFeatureError from other features", () => {
      const error = new NeuroLinkFeatureError(
        "Test error",
        "TEST_CODE",
        "OtherFeature",
      );
      expect(isIOProcessorError(error)).toBe(false);
    });
  });

  describe("createProcessorFailedError", () => {
    it("should create error with processor ID", () => {
      const error = createProcessorFailedError(
        "pii-detection",
        "Detection failed",
      );
      expect(error.code).toBe("PROCESSOR_FAILED");
      expect(error.message).toBe("Detection failed");
      expect(error.details?.processorId).toBe("pii-detection");
    });

    it("should include context if provided", () => {
      const error = createProcessorFailedError(
        "pii-detection",
        "Detection failed",
        {
          processorId: "pii-detection",
          processorType: "input",
          pipelineStep: 2,
          totalSteps: 5,
        },
      );
      expect(error.details?.processorContext?.pipelineStep).toBe(2);
    });
  });

  describe("createPipelineError", () => {
    it("should create error with step information", () => {
      const error = createPipelineError("Pipeline failed", 3, 5);
      expect(error.code).toBe("PIPELINE_ERROR");
      expect(error.details?.pipelineStep).toBe(3);
      expect(error.details?.totalSteps).toBe(5);
    });
  });

  describe("createRegistryError", () => {
    it("should create error with operation information", () => {
      const error = createRegistryError(
        "Registration failed",
        "test-processor",
        "register",
      );
      expect(error.code).toBe("REGISTRY_ERROR");
      expect(error.details?.processorId).toBe("test-processor");
      expect(error.details?.operation).toBe("register");
    });
  });

  describe("createTripwireError", () => {
    it("should create error with tripwire ID", () => {
      const error = createTripwireError("response-too-long", "Tripwire failed");
      expect(error.code).toBe("TRIPWIRE_ERROR");
      expect(error.details?.tripwireId).toBe("response-too-long");
    });
  });

  describe("createValidationError", () => {
    it("should create error with validation errors", () => {
      const error = createValidationError("test-processor", [
        "minLength must be positive",
        "maxLength required",
      ]);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details?.validationErrors).toHaveLength(2);
    });
  });

  describe("createPresetNotFoundError", () => {
    it("should create error with available presets", () => {
      const error = createPresetNotFoundError("unknown", [
        "default",
        "strict",
        "quality",
      ]);
      expect(error.code).toBe("PRESET_NOT_FOUND");
      expect(error.details?.requestedPreset).toBe("unknown");
      expect(error.details?.availablePresets).toContain("default");
    });
  });

  describe("createProcessorNotFoundError", () => {
    it("should create error for input processor", () => {
      const error = createProcessorNotFoundError("unknown-processor", "input");
      expect(error.code).toBe("PROCESSOR_NOT_FOUND");
      expect(error.message).toContain("Input processor");
      expect(error.details?.processorType).toBe("input");
    });

    it("should create error for output processor", () => {
      const error = createProcessorNotFoundError("unknown-processor", "output");
      expect(error.message).toContain("Output processor");
      expect(error.details?.processorType).toBe("output");
    });
  });

  describe("createDuplicateProcessorError", () => {
    it("should create error with suggestion", () => {
      const error = createDuplicateProcessorError("test-processor", "input");
      expect(error.code).toBe("DUPLICATE_PROCESSOR");
      expect(error.message).toContain("already registered");
      expect(error.details?.suggestion).toContain("replace: true");
    });
  });

  describe("createTimeoutError", () => {
    it("should create retryable timeout error", () => {
      const error = createTimeoutError("slow-processor", 5000, 4500);
      expect(error.code).toBe("TIMEOUT_ERROR");
      expect(error.retryable).toBe(true);
      expect(error.details?.timeoutMs).toBe(5000);
      expect(error.details?.executionTimeMs).toBe(4500);
    });
  });

  describe("createConfigurationError", () => {
    it("should create error with config issue", () => {
      const error = createConfigurationError(
        "Invalid configuration",
        "pipelineTimeout must be positive",
      );
      expect(error.code).toBe("CONFIGURATION_ERROR");
      expect(error.details?.configIssue).toBe(
        "pipelineTimeout must be positive",
      );
    });
  });

  describe("createAbortError", () => {
    it("should create error with feedback", () => {
      const error = createAbortError("pii-detection", "PII detected, aborting");
      expect(error.code).toBe("ABORT_ERROR");
      expect(error.details?.processorId).toBe("pii-detection");
      expect(error.details?.feedback).toBe("PII detected, aborting");
    });
  });

  describe("createBatchError", () => {
    it("should create error with batch statistics", () => {
      const errors = [
        { index: 2, error: new Error("Item 2 failed") },
        { index: 5, error: new Error("Item 5 failed") },
      ];
      const error = createBatchError(2, 10, errors);
      expect(error.code).toBe("BATCH_ERROR");
      expect(error.details?.failedCount).toBe(2);
      expect(error.details?.totalCount).toBe(10);
      expect(error.details?.successCount).toBe(8);
      expect(error.details?.errors).toHaveLength(2);
    });
  });
});
