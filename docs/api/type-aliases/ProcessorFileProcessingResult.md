[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorFileProcessingResult

# Type Alias: ProcessorFileProcessingResult\<T\>

> **ProcessorFileProcessingResult**\<`T`\> = `object`

Defined in: [types/processor.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L148)

Result of a file processing operation.
Uses discriminated union pattern for type-safe error handling.

## Example

```typescript
const result = await processor.processFile(fileInfo);
if (result.success) {
  console.log("Processed:", result.data.filename);
} else {
  console.error("Error:", result.error.userMessage);
}
```

## Type Parameters

### T

`T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L152)

Whether the processing was successful

---

### data?

> `optional` **data?**: `T`

Defined in: [types/processor.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L154)

Processed file data (present when success is true)

---

### error?

> `optional` **error?**: [`FileProcessingError`](FileProcessingError.md)

Defined in: [types/processor.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L156)

Error information (present when success is false)
