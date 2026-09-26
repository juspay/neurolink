[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorFileProcessingResult

# Type Alias: ProcessorFileProcessingResult\<T\>

> **ProcessorFileProcessingResult**\<`T`\> = `object`

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

Whether the processing was successful

---

### data?

> `optional` **data?**: `T`

Processed file data (present when success is true)

---

### error?

> `optional` **error?**: [`FileProcessingError`](FileProcessingError.md)

Error information (present when success is false)
