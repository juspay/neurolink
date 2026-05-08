[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProcessingResult

# Type Alias: CliProcessingResult

> **CliProcessingResult** = `object`

Defined in: [types/processor.ts:934](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L934)

Result of CLI file processing

## Properties

### success

> **success**: `boolean`

Defined in: [types/processor.ts:936](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L936)

Whether processing succeeded

---

### processorUsed

> **processorUsed**: `string` \| `null`

Defined in: [types/processor.ts:938](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L938)

Name of the processor that was used

---

### output

> **output**: `string`

Defined in: [types/processor.ts:940](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L940)

Formatted output string

---

### error?

> `optional` **error?**: `string`

Defined in: [types/processor.ts:942](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L942)

Error message if processing failed
