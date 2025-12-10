/**
 * Generic Processor Telemetry Demo
 *
 * This demo shows how the generic processor telemetry feature works across
 * different types of processors (images, PDFs, CSVs, etc.).
 *
 * It demonstrates:
 * - Using telemetry for multiple processor types
 * - Collecting metrics across different operations
 * - Viewing statistics for each processor independently
 * - Reusability of the telemetry system
 */

import { ImageProcessor } from "../dist/utils/imageProcessor.js";
import { ProcessorTelemetryRegistry } from "../dist/telemetry/processorTelemetry.js";

console.log("=== Generic Processor Telemetry Demo ===\n");

// Reset all telemetry instances to start fresh
ProcessorTelemetryRegistry.resetAll();

// Create sample data for different processors
const sampleImages = [
  Buffer.from("small-image-data"), // tiny image
  Buffer.from("a".repeat(50 * 1024)), // small image (50KB)
  Buffer.from("a".repeat(300 * 1024)), // medium image (300KB)
];

console.log("1. Processing images with different providers...\n");

// Process images with different providers
console.log("   Processing with OpenAI...");
for (const img of sampleImages) {
  try {
    ImageProcessor.processImageForOpenAI(img);
  } catch (error) {
    console.log("   Error (expected for demo):", error.message);
  }
}

console.log("   Processing with Google AI...");
for (const img of sampleImages) {
  try {
    ImageProcessor.processImageForGoogle(img);
  } catch (error) {
    console.log("   Error (expected for demo):", error.message);
  }
}

console.log("   Processing with Anthropic...");
for (const img of sampleImages) {
  try {
    ImageProcessor.processImageForAnthropic(img);
  } catch (error) {
    console.log("   Error (expected for demo):", error.message);
  }
}

console.log("\n2. Simulating PDF processing (telemetry tracking only)...\n");

// Get telemetry instance for PDF processing
const pdfTelemetry = ProcessorTelemetryRegistry.getInstance("pdf");

// Simulate PDF operations
pdfTelemetry.recordOperation({
  operation: "extractText",
  dataSize: 200 * 1024, // 200KB
  processingTimeMs: 150,
  success: true,
  provider: "anthropic",
  mimeType: "application/pdf",
});

pdfTelemetry.recordOperation({
  operation: "extractText",
  dataSize: 500 * 1024, // 500KB
  processingTimeMs: 300,
  success: true,
  provider: "google-vertex",
  mimeType: "application/pdf",
});

console.log("3. Simulating CSV processing (telemetry tracking only)...\n");

// Get telemetry instance for CSV processing
const csvTelemetry = ProcessorTelemetryRegistry.getInstance("csv");

// Simulate CSV operations
csvTelemetry.recordOperation({
  operation: "parse",
  dataSize: 50 * 1024, // 50KB
  processingTimeMs: 25,
  success: true,
  mimeType: "text/csv",
  metadata: {
    rows: 1000,
    columns: 10,
  },
});

csvTelemetry.recordOperation({
  operation: "format",
  dataSize: 50 * 1024,
  processingTimeMs: 15,
  success: true,
  mimeType: "text/csv",
  metadata: {
    formatStyle: "json",
  },
});

console.log("\n4. Retrieving telemetry statistics...\n");

// Get statistics for all processor types
const imageTelemetry = ProcessorTelemetryRegistry.getInstance("image");
const imageStats = imageTelemetry.getStats();
const pdfStats = pdfTelemetry.getStats();
const csvStats = csvTelemetry.getStats();

console.log("=== IMAGE PROCESSING STATISTICS ===\n");
console.log(`Total Processed: ${imageStats.totalProcessed}`);
console.log(`Success Count: ${imageStats.successCount}`);
console.log(`Failure Count: ${imageStats.failureCount}`);
console.log(`Success Rate: ${imageStats.successRate}%`);
console.log(
  `Average Processing Time: ${imageStats.averageProcessingTimeMs.toFixed(2)}ms`,
);
console.log(
  `Average Size: ${(imageStats.averageSizeBytes / 1024).toFixed(2)}KB`,
);

console.log("\n--- Image Size Distribution ---");
console.log(`Tiny (<10KB): ${imageStats.sizeDistribution.tiny}`);
console.log(`Small (10-100KB): ${imageStats.sizeDistribution.small}`);
console.log(`Medium (100-500KB): ${imageStats.sizeDistribution.medium}`);

console.log("\n--- Image Operations Breakdown ---");
for (const [operation, count] of Object.entries(
  imageStats.operationBreakdown,
)) {
  if (count > 0) {
    console.log(`${operation}: ${count}`);
  }
}

console.log("\n--- Image Provider Breakdown ---");
for (const [provider, count] of Object.entries(imageStats.providerBreakdown)) {
  console.log(`${provider}: ${count}`);
}

console.log("\n\n=== PDF PROCESSING STATISTICS ===\n");
console.log(`Total Processed: ${pdfStats.totalProcessed}`);
console.log(`Success Rate: ${pdfStats.successRate}%`);
console.log(
  `Average Processing Time: ${pdfStats.averageProcessingTimeMs.toFixed(2)}ms`,
);
console.log(`Average Size: ${(pdfStats.averageSizeBytes / 1024).toFixed(2)}KB`);

console.log("\n--- PDF Operations Breakdown ---");
for (const [operation, count] of Object.entries(pdfStats.operationBreakdown)) {
  console.log(`${operation}: ${count}`);
}

console.log("\n--- PDF Provider Breakdown ---");
for (const [provider, count] of Object.entries(pdfStats.providerBreakdown)) {
  console.log(`${provider}: ${count}`);
}

console.log("\n\n=== CSV PROCESSING STATISTICS ===\n");
console.log(`Total Processed: ${csvStats.totalProcessed}`);
console.log(`Success Rate: ${csvStats.successRate}%`);
console.log(
  `Average Processing Time: ${csvStats.averageProcessingTimeMs.toFixed(2)}ms`,
);
console.log(`Average Size: ${(csvStats.averageSizeBytes / 1024).toFixed(2)}KB`);

console.log("\n--- CSV Operations Breakdown ---");
for (const [operation, count] of Object.entries(csvStats.operationBreakdown)) {
  console.log(`${operation}: ${count}`);
}

console.log("\n\n5. Demonstrating all registered processors...\n");

const allInstances = ProcessorTelemetryRegistry.getAllInstances();
console.log(`Total registered processor types: ${allInstances.size}`);
console.log(
  "Registered processors:",
  Array.from(allInstances.keys()).join(", "),
);

console.log("\n=== Demo Complete ===\n");
console.log("This demonstrates how the GENERIC telemetry system works:");
console.log(
  "- Reusable across ANY processor type (image, PDF, CSV, audio, video, etc.)",
);
console.log("- Independent statistics for each processor type");
console.log(
  "- Consistent tracking of processing time, success/failure, and size distribution",
);
console.log("- Integrated with OpenTelemetry when enabled");
console.log(
  "\nThe same telemetry class can be used for ANY data processing module!",
);
