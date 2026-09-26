[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchFileProcessingResult

# Type Alias: BatchFileProcessingResult

> **BatchFileProcessingResult** = `object`

Defined in: [types/processor.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1144)

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

Defined in: [types/processor.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1146)

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

Defined in: [types/processor.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1152)

Files that failed to process

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### error

> **error**: `string`

---

### skipped

> **skipped**: `object`[]

Defined in: [types/processor.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1157)

Files that were skipped (no processor found or over limit)

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### reason

> **reason**: `string`
