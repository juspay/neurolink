[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorOperationResult

# Type Alias: ProcessorOperationResult\<T\>

> **ProcessorOperationResult**\<`T`\> = `object`

Generic result type for internal operations.
Used for validation and download operations that don't return ProcessedFileBase.

## Type Parameters

### T

`T` = `void`

## Properties

### success

> **success**: `boolean`

Whether the operation was successful

---

### data?

> `optional` **data?**: `T`

Operation result data (present when success is true)

---

### error?

> `optional` **error?**: [`FileProcessingError`](FileProcessingError.md)

Error information (present when success is false)
