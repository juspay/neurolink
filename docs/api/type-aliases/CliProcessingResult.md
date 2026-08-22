[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L990)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L992)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L994)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L996)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L998)

Error message if processing failed
