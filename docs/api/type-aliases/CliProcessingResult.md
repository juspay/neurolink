[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1034)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1036)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1038)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1040)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1042)

Error message if processing failed
