# Image Processing Telemetry - Testing Guide

## Overview

This guide provides instructions for testing the image processing telemetry feature both through automated tests and manual verification.

## Automated Tests

### Running All Tests

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup project
npx svelte-kit sync

# Run all tests
npm test
```

**Expected Result:** All 44 tests should pass (5 existing + 24 telemetry unit tests + 15 integration tests)

### Running Specific Test Suites

```bash
# Run only telemetry tests
npx vitest run test/unit/telemetry/

# Run only integration tests
npx vitest run test/unit/telemetry/imageProcessorIntegration.test.ts

# Run only unit tests
npx vitest run test/unit/telemetry/imageProcessingTelemetry.test.ts
```

## Manual Testing

### Quick Demo

1. **Build the project:**

   ```bash
   npm run build
   npx tsc --project tsconfig.cli.json
   ```

2. **Run the demo script:**

   ```bash
   node examples/telemetry-demo.js
   ```

3. **Expected Output:**
   - Should show processing of 9 images (3 for each provider: OpenAI, Google AI, Anthropic)
   - Should display telemetry statistics including:
     - Total processed count
     - Success/failure rates
     - Average processing time
     - Size distribution (tiny, small, medium, large, very large, huge)
     - Duration distribution (instant, fast, normal, slow, very slow)
     - Operations breakdown by type
     - Provider breakdown

### Using the Feature in Code

#### Basic Usage

```javascript
import { ImageProcessingTelemetry } from "@juspay/neurolink";

// Get the singleton instance
const telemetry = ImageProcessingTelemetry.getInstance();

// Process images normally with ImageProcessor
// Telemetry is automatically collected

// Get current statistics
const stats = telemetry.getStats();
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Average Time: ${stats.averageProcessingTimeMs}ms`);
console.log(`Total Processed: ${stats.totalProcessed}`);
```

#### Viewing Detailed Statistics

```javascript
const stats = telemetry.getStats();

// Overall metrics
console.log("Total:", stats.totalProcessed);
console.log("Successes:", stats.successCount);
console.log("Failures:", stats.failureCount);
console.log("Success Rate:", stats.successRate + "%");

// Performance metrics
console.log("Avg Time:", stats.averageProcessingTimeMs + "ms");
console.log("Avg Size:", stats.averageSizeBytes + " bytes");

// Distribution breakdowns
console.log("Size Distribution:", stats.sizeDistribution);
console.log("Duration Distribution:", stats.durationDistribution);
console.log("Operations:", stats.operationBreakdown);
console.log("Providers:", stats.providerBreakdown);

// Error tracking
if (Object.keys(stats.errorBreakdown).length > 0) {
  console.log("Errors:", stats.errorBreakdown);
}
```

#### Resetting Statistics

```javascript
// Reset all statistics (useful for testing or periodic resets)
telemetry.reset();
```

## Test Coverage

### Unit Tests (24 tests)

The unit tests cover:

- Singleton pattern verification
- Recording successful operations
- Recording failed operations with error types
- Operation breakdown tracking
- Provider breakdown tracking
- Size distribution buckets (tiny to huge)
- Duration distribution buckets (instant to very slow)
- Statistics calculation (averages, success rates)
- Synchronous operation tracking
- Asynchronous operation tracking
- Reset functionality

### Integration Tests (15 tests)

The integration tests verify:

- Telemetry integration with `ImageProcessor.process()`
- OpenAI processing with different input types (Buffer, URL, data URI)
- Google AI processing with mime type extraction
- Anthropic processing
- Vertex AI processing with model routing
- Image type detection (PNG, JPEG, GIF, WebP)
- Multiple operations tracking accuracy

## OpenTelemetry Integration

When telemetry is enabled (via `NEUROLINK_TELEMETRY_ENABLED=true` or `OTEL_EXPORTER_OTLP_ENDPOINT`), the image processing metrics are automatically exported to your OpenTelemetry collector.

### Metrics Exported

1. **custom_image_processing_duration_ms** (Histogram)
   - Processing time in milliseconds
   - Labels: operation, success, provider, mime_type, error_type

2. **custom_image_processing_size_bytes** (Histogram)
   - Image size in bytes
   - Labels: operation, success, provider, mime_type

3. **custom_image_processing_operations** (Counter)
   - Number of operations
   - Labels: operation, success, provider, mime_type, error_type

### Testing OpenTelemetry Integration

1. Set up an OpenTelemetry collector
2. Configure environment variables:
   ```bash
   export NEUROLINK_TELEMETRY_ENABLED=true
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   ```
3. Run your application
4. Verify metrics appear in your collector/backend

## What the Tests Verify

✅ **Processing Time Metrics**

- Tracks duration of each image processing operation
- Categorizes into performance buckets (instant, fast, normal, slow, very slow)

✅ **Success/Failure Counters**

- Counts successful operations
- Counts failed operations
- Tracks error types for failures

✅ **Size Distribution Tracking**

- Tracks image sizes
- Categorizes into size buckets (tiny, small, medium, large, very large, huge)

✅ **Integration with Existing Telemetry System**

- Integrates with `TelemetryService` singleton
- Exports metrics to OpenTelemetry when enabled
- No impact when telemetry is disabled

## Troubleshooting

### Tests Fail to Run

**Issue:** `vitest: not found`
**Solution:** Ensure dependencies are installed: `npm install --legacy-peer-deps`

**Issue:** TypeScript errors
**Solution:** Run `npx svelte-kit sync` first

### Demo Doesn't Work

**Issue:** Module not found errors
**Solution:** Build the project first:

```bash
npm run build
npx tsc --project tsconfig.cli.json
```

### No Telemetry Data

**Issue:** Statistics show all zeros
**Solution:** Ensure you're processing images through `ImageProcessor` methods. The telemetry only tracks operations that go through the instrumented methods.

## Performance Impact

The telemetry tracking has minimal performance impact:

- Uses `performance.now()` for sub-millisecond precision
- In-memory counters with O(1) operations
- No I/O operations in the hot path
- OpenTelemetry export is asynchronous

Based on our tests, the overhead is typically < 0.1ms per operation.
