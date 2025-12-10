import { describe, it, expect, beforeEach } from "vitest";
import {
  ProcessorTelemetry,
  ProcessorTelemetryRegistry,
} from "../../../src/lib/telemetry/processorTelemetry.js";

describe("ProcessorTelemetry (Generic)", () => {
  let imageTelemetry: ProcessorTelemetry;
  let pdfTelemetry: ProcessorTelemetry;
  let csvTelemetry: ProcessorTelemetry;

  beforeEach(() => {
    // Reset all instances
    ProcessorTelemetryRegistry.resetAll();

    // Get fresh instances for different processor types
    imageTelemetry = ProcessorTelemetryRegistry.getInstance("image");
    pdfTelemetry = ProcessorTelemetryRegistry.getInstance("pdf");
    csvTelemetry = ProcessorTelemetryRegistry.getInstance("csv");
  });

  describe("ProcessorTelemetryRegistry", () => {
    it("should return same instance for same processor type (singleton pattern)", () => {
      const instance1 = ProcessorTelemetryRegistry.getInstance("image");
      const instance2 = ProcessorTelemetryRegistry.getInstance("image");
      expect(instance1).toBe(instance2);
    });

    it("should return different instances for different processor types", () => {
      const imageInstance = ProcessorTelemetryRegistry.getInstance("image");
      const pdfInstance = ProcessorTelemetryRegistry.getInstance("pdf");
      expect(imageInstance).not.toBe(pdfInstance);
    });

    it("should track all instances", () => {
      ProcessorTelemetryRegistry.getInstance("image");
      ProcessorTelemetryRegistry.getInstance("pdf");
      ProcessorTelemetryRegistry.getInstance("csv");

      const instances = ProcessorTelemetryRegistry.getAllInstances();
      expect(instances.size).toBe(3);
      expect(instances.has("image")).toBe(true);
      expect(instances.has("pdf")).toBe(true);
      expect(instances.has("csv")).toBe(true);
    });

    it("should reset all instances", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 10,
        success: true,
      });
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 2048,
        processingTimeMs: 20,
        success: true,
      });

      ProcessorTelemetryRegistry.resetAll();

      expect(imageTelemetry.getStats().totalProcessed).toBe(0);
      expect(pdfTelemetry.getStats().totalProcessed).toBe(0);
    });
  });

  describe("recordOperation", () => {
    it("should record successful operations", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 10,
        success: true,
        mimeType: "image/png",
      });

      const stats = imageTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it("should record failed operations", () => {
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 2048,
        processingTimeMs: 5,
        success: false,
        errorType: "ValidationError",
      });

      const stats = pdfTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(1);
      expect(stats.successRate).toBe(0);
      expect(stats.errorBreakdown["ValidationError"]).toBe(1);
    });

    it("should track operation breakdown for different processors", () => {
      imageTelemetry.recordOperation({
        operation: "processForOpenAI",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
      });
      pdfTelemetry.recordOperation({
        operation: "extractText",
        dataSize: 2048,
        processingTimeMs: 8,
        success: true,
      });
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 3072,
        processingTimeMs: 12,
        success: true,
      });

      expect(
        imageTelemetry.getStats().operationBreakdown.processForOpenAI,
      ).toBe(1);
      expect(pdfTelemetry.getStats().operationBreakdown.extractText).toBe(1);
      expect(csvTelemetry.getStats().operationBreakdown.parse).toBe(1);
    });

    it("should track provider breakdown", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        provider: "openai",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
      });
      imageTelemetry.recordOperation({
        operation: "process",
        provider: "google-ai",
        dataSize: 2048,
        processingTimeMs: 8,
        success: true,
      });

      const stats = imageTelemetry.getStats();
      expect(stats.providerBreakdown["openai"]).toBe(1);
      expect(stats.providerBreakdown["google-ai"]).toBe(1);
    });

    it("should support custom metadata", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
        metadata: {
          format: "png",
          width: 1920,
          height: 1080,
          compressed: true,
        },
      });

      // Metadata doesn't affect stats, but is recorded to OpenTelemetry
      const stats = imageTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
    });
  });

  describe("size distribution", () => {
    it("should classify tiny data (< 10KB)", () => {
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 5 * 1024, // 5KB
        processingTimeMs: 1,
        success: true,
      });

      const stats = csvTelemetry.getStats();
      expect(stats.sizeDistribution.tiny).toBe(1);
    });

    it("should classify small data (10KB - 100KB)", () => {
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 50 * 1024, // 50KB
        processingTimeMs: 1,
        success: true,
      });

      const stats = pdfTelemetry.getStats();
      expect(stats.sizeDistribution.small).toBe(1);
    });

    it("should classify medium data (100KB - 500KB)", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 300 * 1024, // 300KB
        processingTimeMs: 1,
        success: true,
      });

      const stats = imageTelemetry.getStats();
      expect(stats.sizeDistribution.medium).toBe(1);
    });

    it("should classify large data (500KB - 1MB)", () => {
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 800 * 1024, // 800KB
        processingTimeMs: 1,
        success: true,
      });

      const stats = pdfTelemetry.getStats();
      expect(stats.sizeDistribution.large).toBe(1);
    });

    it("should classify very large data (1MB - 5MB)", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 2 * 1024 * 1024, // 2MB
        processingTimeMs: 1,
        success: true,
      });

      const stats = imageTelemetry.getStats();
      expect(stats.sizeDistribution.very_large).toBe(1);
    });

    it("should classify huge data (> 5MB)", () => {
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 10 * 1024 * 1024, // 10MB
        processingTimeMs: 1,
        success: true,
      });

      const stats = pdfTelemetry.getStats();
      expect(stats.sizeDistribution.huge).toBe(1);
    });
  });

  describe("duration distribution", () => {
    it("should classify instant processing (< 1ms)", () => {
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 1024,
        processingTimeMs: 0.5,
        success: true,
      });

      const stats = csvTelemetry.getStats();
      expect(stats.durationDistribution.instant).toBe(1);
    });

    it("should classify fast processing (1ms - 10ms)", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
      });

      const stats = imageTelemetry.getStats();
      expect(stats.durationDistribution.fast).toBe(1);
    });

    it("should classify normal processing (10ms - 100ms)", () => {
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 1024,
        processingTimeMs: 50,
        success: true,
      });

      const stats = pdfTelemetry.getStats();
      expect(stats.durationDistribution.normal).toBe(1);
    });

    it("should classify slow processing (100ms - 500ms)", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 300,
        success: true,
      });

      const stats = imageTelemetry.getStats();
      expect(stats.durationDistribution.slow).toBe(1);
    });

    it("should classify very slow processing (> 500ms)", () => {
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 1024,
        processingTimeMs: 1000,
        success: true,
      });

      const stats = pdfTelemetry.getStats();
      expect(stats.durationDistribution.very_slow).toBe(1);
    });
  });

  describe("getStats", () => {
    it("should calculate averages correctly", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1000,
        processingTimeMs: 10,
        success: true,
      });
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 2000,
        processingTimeMs: 20,
        success: true,
      });
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 3000,
        processingTimeMs: 30,
        success: true,
      });

      const stats = imageTelemetry.getStats();
      expect(stats.averageProcessingTimeMs).toBe(20);
      expect(stats.averageSizeBytes).toBe(2000);
    });

    it("should calculate success rate correctly", () => {
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
      });
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
      });
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 1024,
        processingTimeMs: 5,
        success: false,
        errorType: "TestError",
      });
      csvTelemetry.recordOperation({
        operation: "parse",
        dataSize: 1024,
        processingTimeMs: 5,
        success: true,
      });

      const stats = csvTelemetry.getStats();
      expect(stats.successRate).toBe(75);
    });

    it("should handle empty stats", () => {
      const stats = imageTelemetry.getStats();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageProcessingTimeMs).toBe(0);
      expect(stats.averageSizeBytes).toBe(0);
    });

    it("should isolate stats between different processor types", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 10,
        success: true,
      });
      pdfTelemetry.recordOperation({
        operation: "extract",
        dataSize: 2048,
        processingTimeMs: 20,
        success: true,
      });

      const imageStats = imageTelemetry.getStats();
      const pdfStats = pdfTelemetry.getStats();

      expect(imageStats.totalProcessed).toBe(1);
      expect(pdfStats.totalProcessed).toBe(1);
      expect(imageStats.averageSizeBytes).toBe(1024);
      expect(pdfStats.averageSizeBytes).toBe(2048);
    });
  });

  describe("trackSync", () => {
    it("should track synchronous successful operations", () => {
      const result = imageTelemetry.trackSync(
        "detectType",
        1024,
        () => "image/png",
        { mimeType: "image/png" },
      );

      expect(result).toBe("image/png");
      const stats = imageTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.operationBreakdown.detectType).toBe(1);
    });

    it("should track synchronous failed operations", () => {
      expect(() => {
        pdfTelemetry.trackSync(
          "validate",
          1024,
          () => {
            throw new Error("PDF too large");
          },
          {},
        );
      }).toThrow("PDF too large");

      const stats = pdfTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.failureCount).toBe(1);
      expect(stats.errorBreakdown["Error"]).toBe(1);
    });
  });

  describe("trackOperation (async)", () => {
    it("should track asynchronous successful operations", async () => {
      const result = await csvTelemetry.trackOperation(
        "parse",
        1024,
        async () => "parsed",
        { provider: "custom" },
      );

      expect(result).toBe("parsed");
      const stats = csvTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.providerBreakdown["custom"]).toBe(1);
    });

    it("should track asynchronous failed operations", async () => {
      await expect(
        imageTelemetry.trackOperation("process", 1024, async () => {
          throw new Error("Processing failed");
        }),
      ).rejects.toThrow("Processing failed");

      const stats = imageTelemetry.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.failureCount).toBe(1);
    });
  });

  describe("reset", () => {
    it("should reset all statistics", () => {
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 1024,
        processingTimeMs: 10,
        success: true,
        provider: "openai",
      });
      imageTelemetry.recordOperation({
        operation: "process",
        dataSize: 2048,
        processingTimeMs: 20,
        success: false,
        errorType: "TestError",
      });

      imageTelemetry.reset();

      const stats = imageTelemetry.getStats();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(Object.keys(stats.providerBreakdown).length).toBe(0);
      expect(Object.keys(stats.errorBreakdown).length).toBe(0);
    });
  });

  describe("cross-processor usage", () => {
    it("should work for custom processor types", () => {
      const audioTelemetry = ProcessorTelemetryRegistry.getInstance("audio");
      const videoTelemetry = ProcessorTelemetryRegistry.getInstance("video");

      audioTelemetry.recordOperation({
        operation: "transcode",
        dataSize: 5 * 1024 * 1024,
        processingTimeMs: 1000,
        success: true,
        metadata: { codec: "mp3", bitrate: 320 },
      });

      videoTelemetry.recordOperation({
        operation: "encode",
        dataSize: 50 * 1024 * 1024,
        processingTimeMs: 5000,
        success: true,
        metadata: { codec: "h264", resolution: "1080p" },
      });

      expect(audioTelemetry.getStats().totalProcessed).toBe(1);
      expect(videoTelemetry.getStats().totalProcessed).toBe(1);
      expect(audioTelemetry.getStats().averageSizeBytes).toBe(5 * 1024 * 1024);
      expect(videoTelemetry.getStats().averageSizeBytes).toBe(50 * 1024 * 1024);
    });
  });
});
