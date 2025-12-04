/**
 * Image Processing Telemetry Demo
 *
 * This demo shows how the image processing telemetry feature works.
 * It demonstrates:
 * - Processing images with different providers
 * - Collecting telemetry metrics
 * - Viewing statistics
 */

import { ImageProcessor } from "../dist/utils/imageProcessor.js";
import { ImageProcessingTelemetry } from "../dist/telemetry/imageProcessingTelemetry.js";

// Get telemetry instance
const telemetry = ImageProcessingTelemetry.getInstance();

console.log("=== Image Processing Telemetry Demo ===\n");

// Reset stats to start fresh
telemetry.reset();

// Create sample image data (simulated)
const sampleImages = [
  Buffer.from("small-image-data"), // tiny image
  Buffer.from("a".repeat(50 * 1024)), // small image (50KB)
  Buffer.from("a".repeat(300 * 1024)), // medium image (300KB)
];

console.log("1. Processing images with different providers...\n");

// Process images with OpenAI
console.log("   Processing with OpenAI...");
for (const img of sampleImages) {
  try {
    ImageProcessor.processImageForOpenAI(img);
  } catch (error) {
    console.log("   Error (expected for demo):", error.message);
  }
}

// Process images with Google AI
console.log("   Processing with Google AI...");
for (const img of sampleImages) {
  try {
    ImageProcessor.processImageForGoogle(img);
  } catch (error) {
    console.log("   Error (expected for demo):", error.message);
  }
}

// Process images with Anthropic
console.log("   Processing with Anthropic...");
for (const img of sampleImages) {
  try {
    ImageProcessor.processImageForAnthropic(img);
  } catch (error) {
    console.log("   Error (expected for demo):", error.message);
  }
}

console.log("\n2. Retrieving telemetry statistics...\n");

// Get statistics
const stats = telemetry.getStats();

console.log("=== Telemetry Statistics ===\n");
console.log(`Total Processed: ${stats.totalProcessed}`);
console.log(`Success Count: ${stats.successCount}`);
console.log(`Failure Count: ${stats.failureCount}`);
console.log(`Success Rate: ${stats.successRate}%`);
console.log(
  `Average Processing Time: ${stats.averageProcessingTimeMs.toFixed(2)}ms`,
);
console.log(`Average Size: ${(stats.averageSizeBytes / 1024).toFixed(2)}KB`);

console.log("\n--- Size Distribution ---");
console.log(`Tiny (<10KB): ${stats.sizeDistribution.tiny}`);
console.log(`Small (10-100KB): ${stats.sizeDistribution.small}`);
console.log(`Medium (100-500KB): ${stats.sizeDistribution.medium}`);
console.log(`Large (500KB-1MB): ${stats.sizeDistribution.large}`);
console.log(`Very Large (1-5MB): ${stats.sizeDistribution.very_large}`);
console.log(`Huge (>5MB): ${stats.sizeDistribution.huge}`);

console.log("\n--- Duration Distribution ---");
console.log(`Instant (<1ms): ${stats.durationDistribution.instant}`);
console.log(`Fast (1-10ms): ${stats.durationDistribution.fast}`);
console.log(`Normal (10-100ms): ${stats.durationDistribution.normal}`);
console.log(`Slow (100-500ms): ${stats.durationDistribution.slow}`);
console.log(`Very Slow (>500ms): ${stats.durationDistribution.very_slow}`);

console.log("\n--- Operations Breakdown ---");
for (const [operation, count] of Object.entries(stats.operationBreakdown)) {
  if (count > 0) {
    console.log(`${operation}: ${count}`);
  }
}

console.log("\n--- Provider Breakdown ---");
for (const [provider, count] of Object.entries(stats.providerBreakdown)) {
  console.log(`${provider}: ${count}`);
}

if (Object.keys(stats.errorBreakdown).length > 0) {
  console.log("\n--- Error Breakdown ---");
  for (const [errorType, count] of Object.entries(stats.errorBreakdown)) {
    console.log(`${errorType}: ${count}`);
  }
}

console.log("\n=== Demo Complete ===\n");
console.log("This demonstrates how the telemetry feature tracks:");
console.log("- Processing time for each operation");
console.log("- Success/failure rates");
console.log("- Size distribution of processed images");
console.log("- Operation and provider breakdowns");
console.log("\nThe telemetry integrates with OpenTelemetry when enabled.");
