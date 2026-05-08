[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnsupportedFileError

# Type Alias: UnsupportedFileError

> **UnsupportedFileError** = `object`

Defined in: [types/processor.ts:357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L357)

Detailed error information for unsupported file types.
Provides helpful suggestions for the user.

## Properties

### code

> **code**: `"NO_PROCESSOR_FOUND"` \| `"PROCESSING_FAILED"`

Defined in: [types/processor.ts:359](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L359)

Error code for programmatic handling

---

### message

> **message**: `string`

Defined in: [types/processor.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L362)

Human-readable error message

---

### filename

> **filename**: `string`

Defined in: [types/processor.ts:365](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L365)

Original filename

---

### mimetype

> **mimetype**: `string`

Defined in: [types/processor.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L368)

MIME type of the file

---

### suggestion

> **suggestion**: `string`

Defined in: [types/processor.ts:371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L371)

Helpful suggestion for the user

---

### supportedTypes

> **supportedTypes**: `string`[]

Defined in: [types/processor.ts:374](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L374)

List of supported file types
