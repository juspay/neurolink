[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FailedFileInfo

# Type Alias: FailedFileInfo

> **FailedFileInfo** = `object`

Defined in: [types/processor.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L240)

Information about a file that failed to process.

## Properties

### fileId

> **fileId**: `string`

Defined in: [types/processor.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L242)

File identifier

---

### filename

> **filename**: `string`

Defined in: [types/processor.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L244)

Filename

---

### mimetype

> **mimetype**: `string`

Defined in: [types/processor.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L246)

MIME type

---

### size

> **size**: `number`

Defined in: [types/processor.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L248)

Size in bytes

---

### error

> **error**: [`FileProcessingError`](FileProcessingError.md)

Defined in: [types/processor.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L250)

Error that caused the failure
