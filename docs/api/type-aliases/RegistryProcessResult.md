[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistryProcessResult

# Type Alias: RegistryProcessResult\<T\>

> **RegistryProcessResult**\<`T`\> = `object`

Defined in: [types/processor.ts:381](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L381)

Result of processing a file through the registry.
Includes type information for tracking which processor was used.

## Type Parameters

### T

`T` = `unknown`

## Properties

### type

> **type**: `string`

Defined in: [types/processor.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L383)

Type/name of the processor that handled the file

---

### data

> **data**: `T` \| `null`

Defined in: [types/processor.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L386)

Processed data (null if processing failed)

---

### error?

> `optional` **error?**: [`UnsupportedFileError`](UnsupportedFileError.md)

Defined in: [types/processor.ts:389](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L389)

Error information if processing failed
