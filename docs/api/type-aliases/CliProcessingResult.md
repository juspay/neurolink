[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1006)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1008)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1010)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1012)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1014)

Error message if processing failed
