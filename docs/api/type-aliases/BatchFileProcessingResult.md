[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchFileProcessingResult

# Type Alias: BatchFileProcessingResult

> **BatchFileProcessingResult** = `object`

Result of processing multiple files through the registry.
Categorizes files into successful, failed, and skipped.

## Example

```typescript
const result = await processBatchWithRegistry(files);

// Handle successful files
for (const { fileInfo, processorName, result } of result.successful) {
  console.log(`${fileInfo.name}: processed by ${processorName}`);
}

// Handle failed files
for (const { fileInfo, error } of result.failed) {
  console.error(`${fileInfo.name}: ${error}`);
}

// Handle skipped files
for (const { fileInfo, reason } of result.skipped) {
  console.warn(`${fileInfo.name}: ${reason}`);
}
```

## Properties

### successful

> **successful**: `object`[]

Successfully processed files

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### processorName

> **processorName**: `string`

#### result

> **result**: [`ProcessorFileProcessingResult`](ProcessorFileProcessingResult.md)\<[`ProcessedFileBase`](ProcessedFileBase.md)\>

---

### failed

> **failed**: `object`[]

Files that failed to process

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### error

> **error**: `string`

---

### skipped

> **skipped**: `object`[]

Files that were skipped (no processor found or over limit)

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### reason

> **reason**: `string`
