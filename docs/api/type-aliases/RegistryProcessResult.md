[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistryProcessResult

# Type Alias: RegistryProcessResult\<T\>

> **RegistryProcessResult**\<`T`\> = `object`

Result of processing a file through the registry.
Includes type information for tracking which processor was used.

## Type Parameters

### T

`T` = `unknown`

## Properties

### type

> **type**: `string`

Type/name of the processor that handled the file

---

### data

> **data**: `T` \| `null`

Processed data (null if processing failed)

---

### error?

> `optional` **error?**: [`UnsupportedFileError`](UnsupportedFileError.md)

Error information if processing failed
