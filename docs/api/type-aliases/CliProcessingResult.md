[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1001)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1003)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1005)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:1007](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1007)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1009)

Error message if processing failed
