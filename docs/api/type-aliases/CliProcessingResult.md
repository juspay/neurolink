[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:990](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L990)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:992](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L992)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:994](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L994)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:996](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L996)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:998](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L998)

Error message if processing failed
