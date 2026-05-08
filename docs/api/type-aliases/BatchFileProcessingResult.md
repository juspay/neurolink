[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchFileProcessingResult

# Type Alias: BatchFileProcessingResult

> **BatchFileProcessingResult** = `object`

Defined in: [types/processor.ts:1044](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1044)

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

Defined in: [types/processor.ts:1046](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1046)

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

Defined in: [types/processor.ts:1052](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1052)

Files that failed to process

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### error

> **error**: `string`

---

### skipped

> **skipped**: `object`[]

Defined in: [types/processor.ts:1057](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1057)

Files that were skipped (no processor found or over limit)

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### reason

> **reason**: `string`
