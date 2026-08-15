[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorOperationResult

# Type Alias: ProcessorOperationResult\<T\>

> **ProcessorOperationResult**\<`T`\> = `object`

Defined in: [types/processor.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L125)

Generic result type for internal operations.
Used for validation and download operations that don't return ProcessedFileBase.

## Type Parameters

### T

`T` = `void`

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L127)

Whether the operation was successful

---

### data?

> `optional` **data?**: `T`

Defined in: [types/processor.ts:129](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L129)

Operation result data (present when success is true)

---

### error?

> `optional` **error?**: [`FileProcessingError`](FileProcessingError.md)

Defined in: [types/processor.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L131)

Error information (present when success is false)
