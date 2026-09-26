[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1009)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1011)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1013)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1015)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1017)

Error message if processing failed
