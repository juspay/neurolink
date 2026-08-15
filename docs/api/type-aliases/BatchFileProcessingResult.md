[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchFileProcessingResult

# Type Alias: BatchFileProcessingResult

> **BatchFileProcessingResult** = `object`

Defined in: [types/processor.ts:1100](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1100)

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

Defined in: [types/processor.ts:1102](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1102)

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

Defined in: [types/processor.ts:1108](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1108)

Files that failed to process

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### error

> **error**: `string`

---

### skipped

> **skipped**: `object`[]

Defined in: [types/processor.ts:1113](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1113)

Files that were skipped (no processor found or over limit)

#### fileInfo

> **fileInfo**: [`FileInfo`](FileInfo.md)

#### reason

> **reason**: `string`
