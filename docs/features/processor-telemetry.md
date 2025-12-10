# Generic Processor Telemetry

## Overview

NeuroLink provides a **generic, reusable telemetry system** for tracking metrics across any type of data processing operation. This unified approach ensures consistent monitoring whether you're processing images, PDFs, CSVs, audio, video, or any other data type.

## Why Generic Telemetry?

The generic telemetry system offers several advantages:

- **Reusability**: One telemetry class works for all processor types
- **Consistency**: Same metrics across all processors (processing time, success/failure, size distribution)
- **Scalability**: Easy to add telemetry to new processors
- **Independence**: Each processor type has isolated statistics
- **OpenTelemetry Integration**: Automatic export to monitoring systems

## Architecture

```typescript
ProcessorTelemetryRegistry
├── Image Processing Telemetry
├── PDF Processing Telemetry
├── CSV Processing Telemetry
├── Audio Processing Telemetry (future)
├── Video Processing Telemetry (future)
└── Custom Processor Telemetry (any type)
```

## Usage

### Basic Usage

```typescript
import { ProcessorTelemetryRegistry } from "@juspay/neurolink";

// Get telemetry instance for image processing
const imageTelemetry = ProcessorTelemetryRegistry.getInstance("image");

// Get telemetry instance for PDF processing
const pdfTelemetry = ProcessorTelemetryRegistry.getInstance("pdf");

// Get telemetry instance for CSV processing
const csvTelemetry = ProcessorTelemetryRegistry.getInstance("csv");

// Works for any processor type!
const audioTelemetry = ProcessorTelemetryRegistry.getInstance("audio");
const videoTelemetry = ProcessorTelemetryRegistry.getInstance("video");
```

### Recording Operations

```typescript
// Manual recording
imageTelemetry.recordOperation({
  operation: "processForOpenAI",
  dataSize: 1024 * 300, // 300KB
  processingTimeMs: 15.5,
  success: true,
  provider: "openai",
  mimeType: "image/png",
  metadata: {
    width: 1920,
    height: 1080,
  },
});

// Automatic timing (async)
const result = await imageTelemetry.trackOperation(
  "process",
  imageBuffer.length,
  async () => {
    // Your processing logic here
    return processImage(imageBuffer);
  },
  { provider: "anthropic", mimeType: "image/jpeg" },
);

// Automatic timing (sync)
const type = imageTelemetry.trackSync(
  "detectImageType",
  buffer.length,
  () => detectType(buffer),
  { mimeType: "image/png" },
);
```

### Viewing Statistics

```typescript
const stats = imageTelemetry.getStats();

console.log("Overall Metrics:");
console.log(`Total Processed: ${stats.totalProcessed}`);
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Average Time: ${stats.averageProcessingTimeMs}ms`);
console.log(`Average Size: ${stats.averageSizeBytes} bytes`);

console.log("\nSize Distribution:");
console.log(stats.sizeDistribution);
// { tiny: 10, small: 45, medium: 30, large: 10, very_large: 5, huge: 0 }

console.log("\nDuration Distribution:");
console.log(stats.durationDistribution);
// { instant: 20, fast: 60, normal: 15, slow: 4, very_slow: 1 }

console.log("\nOperation Breakdown:");
console.log(stats.operationBreakdown);
// { processForOpenAI: 30, processForGoogle: 40, processForAnthropic: 30 }

console.log("\nProvider Breakdown:");
console.log(stats.providerBreakdown);
// { openai: 30, 'google-ai': 40, anthropic: 30 }

console.log("\nError Breakdown:");
console.log(stats.errorBreakdown);
// { ValidationError: 2, TimeoutError: 1 }
```

### Registry Management

```typescript
// Get all registered processor types
const allInstances = ProcessorTelemetryRegistry.getAllInstances();
console.log(`Registered processors:`, Array.from(allInstances.keys()));
// ['image', 'pdf', 'csv', 'audio', 'video']

// Reset statistics for a specific processor
imageTelemetry.reset();

// Reset all processors
ProcessorTelemetryRegistry.resetAll();
```

## Integration Examples

### Image Processor

```typescript
import { ProcessorTelemetryRegistry } from "@juspay/neurolink";

export class ImageProcessor {
  private static telemetry = ProcessorTelemetryRegistry.getInstance("image");

  static async process(content: Buffer): Promise<ProcessedImage> {
    const mediaType = this.detectImageType(content);
    return this.telemetry.trackOperation(
      "process",
      content.length,
      async () => {
        // Processing logic
        const base64 = content.toString("base64");
        return { data: base64, mediaType };
      },
      { mimeType: mediaType },
    );
  }
}
```

### PDF Processor

```typescript
import { ProcessorTelemetryRegistry } from "@juspay/neurolink";

export class PDFProcessor {
  private static telemetry = ProcessorTelemetryRegistry.getInstance("pdf");

  static async extractText(pdfBuffer: Buffer): Promise<string> {
    return this.telemetry.trackOperation(
      "extractText",
      pdfBuffer.length,
      async () => {
        // PDF extraction logic
        return extractedText;
      },
      { mimeType: "application/pdf" },
    );
  }
}
```

### CSV Processor

```typescript
import { ProcessorTelemetryRegistry } from "@juspay/neurolink";

export class CSVProcessor {
  private static telemetry = ProcessorTelemetryRegistry.getInstance("csv");

  static async parse(csvBuffer: Buffer): Promise<ParsedData> {
    return this.telemetry.trackOperation(
      "parse",
      csvBuffer.length,
      async () => {
        // CSV parsing logic
        return parsedData;
      },
      {
        mimeType: "text/csv",
        metadata: { rows: data.length, columns: data[0]?.length },
      },
    );
  }
}
```

### Custom Processor

```typescript
import { ProcessorTelemetryRegistry } from "@juspay/neurolink";

export class AudioProcessor {
  private static telemetry = ProcessorTelemetryRegistry.getInstance("audio");

  static async transcode(audioBuffer: Buffer, codec: string): Promise<Buffer> {
    return this.telemetry.trackOperation(
      "transcode",
      audioBuffer.length,
      async () => {
        // Audio transcoding logic
        return transcodedAudio;
      },
      {
        mimeType: "audio/mpeg",
        metadata: { codec, bitrate: 320 },
      },
    );
  }
}
```

## Metrics Tracked

### Counters

- **Total operations**: Count of all processing operations
- **Success count**: Number of successful operations
- **Failure count**: Number of failed operations
- **Operation breakdown**: Count by operation type
- **Provider breakdown**: Count by provider
- **Error breakdown**: Count by error type

### Histograms

- **Processing time**: Duration of each operation (instant/fast/normal/slow/very_slow)
- **Data size**: Size of processed data (tiny/small/medium/large/very_large/huge)

### Computed Metrics

- **Success rate**: Percentage of successful operations
- **Average processing time**: Mean duration across all operations
- **Average data size**: Mean size across all operations

## Size Buckets

| Bucket     | Range         |
| ---------- | ------------- |
| tiny       | < 10KB        |
| small      | 10KB - 100KB  |
| medium     | 100KB - 500KB |
| large      | 500KB - 1MB   |
| very_large | 1MB - 5MB     |
| huge       | > 5MB         |

## Duration Buckets

| Bucket    | Range         |
| --------- | ------------- |
| instant   | < 1ms         |
| fast      | 1ms - 10ms    |
| normal    | 10ms - 100ms  |
| slow      | 100ms - 500ms |
| very_slow | > 500ms       |

## OpenTelemetry Integration

When telemetry is enabled (via `NEUROLINK_TELEMETRY_ENABLED=true` or `OTEL_EXPORTER_OTLP_ENDPOINT`), metrics are automatically exported to your OpenTelemetry collector.

### Exported Metrics

For each processor type (e.g., `image`, `pdf`, `csv`):

1. **`custom_{processor}_processing_duration_ms`** (Histogram)
   - Processing time in milliseconds
   - Labels: `processor_type`, `operation`, `success`, `provider`, `mime_type`, `error_type`, custom metadata

2. **`custom_{processor}_processing_size_bytes`** (Histogram)
   - Data size in bytes
   - Labels: `processor_type`, `operation`, `success`, `provider`, `mime_type`

3. **`custom_{processor}_processing_operations`** (Counter)
   - Number of operations
   - Labels: `processor_type`, `operation`, `success`, `provider`, `mime_type`, `error_type`

### Example Queries

```promql
# Average image processing time
rate(custom_image_processing_duration_ms_sum[5m]) / rate(custom_image_processing_duration_ms_count[5m])

# Success rate by processor type
sum(rate(custom_image_processing_operations{success="true"}[5m])) / sum(rate(custom_image_processing_operations[5m]))

# Processing throughput
sum(rate(custom_image_processing_operations[5m])) by (processor_type)
```

## Benefits

### For Developers

- **Easy to use**: Single line to add telemetry to any processor
- **Consistent API**: Same interface across all processor types
- **Type-safe**: Full TypeScript support with generics
- **Flexible**: Support for custom metadata

### For Operations

- **Unified monitoring**: One system for all processors
- **Standardized metrics**: Consistent measurements across services
- **Easy debugging**: Detailed breakdown by operation, provider, and error type
- **Performance insights**: Identify bottlenecks and optimization opportunities

### For Product

- **Usage analytics**: Understand how features are being used
- **Quality metrics**: Track success rates and error patterns
- **Performance tracking**: Monitor system health and responsiveness
- **Capacity planning**: Predict resource needs based on usage patterns

## Migration from Legacy Telemetry

If you were using the legacy `ImageProcessingTelemetry`:

```typescript
// OLD (deprecated)
import { ImageProcessingTelemetry } from "@juspay/neurolink";
const telemetry = ImageProcessingTelemetry.getInstance();

// NEW (recommended)
import { ProcessorTelemetryRegistry } from "@juspay/neurolink";
const telemetry = ProcessorTelemetryRegistry.getInstance("image");
```

The API is identical, but the new version is:

- More generic and reusable
- Better organized
- Easier to extend to new processor types

## Best Practices

1. **Use the registry**: Always use `ProcessorTelemetryRegistry.getInstance()` for consistency
2. **Choose meaningful names**: Use clear processor type names (`image`, `pdf`, `csv`, not `type1`, `x`)
3. **Track at boundaries**: Instrument public methods, not internal helpers
4. **Include context**: Use `provider`, `model`, and `metadata` for rich telemetry
5. **Handle errors**: Ensure telemetry is recorded even when operations fail
6. **Reset periodically**: Consider periodic resets in long-running processes to prevent memory growth

## Performance Impact

The telemetry system has minimal overhead:

- Uses `performance.now()` for sub-millisecond precision
- In-memory counters with O(1) operations
- No I/O operations in the hot path
- OpenTelemetry export is asynchronous
- Typical overhead: < 0.1ms per operation

## See Also

- [Testing Guide](../testing/image-telemetry-testing.md) - How to test telemetry
- [OpenTelemetry Setup](https://opentelemetry.io/docs/) - Official OpenTelemetry documentation
- [TelemetryService](../../src/lib/telemetry/telemetryService.ts) - Core telemetry infrastructure
