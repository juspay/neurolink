[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorMatch

# Type Alias: ProcessorMatch\<\_T\>

> **ProcessorMatch**\<`_T`\> = `object`

Defined in: [types/processor.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L314)

Result of finding a matching processor for a file.
Includes both the processor and metadata about the match quality.

Note: `processor` is typed as `unknown` here to avoid circular dependency
on BaseFileProcessor. The registry module uses the properly typed version.

## Type Parameters

### \_T

`_T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:316](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L316)

Name of the matched processor

---

### processor

> **processor**: `unknown`

Defined in: [types/processor.ts:319](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L319)

The processor instance

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L322)

Priority level of this processor

---

### confidence

> **confidence**: `number`

Defined in: [types/processor.ts:332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L332)

Confidence score for the match (0-100).
Higher values indicate better match quality:

- 100: Exact MIME type match
- 80: MIME type prefix match (e.g., "image/\*")
- 60: File extension match
- 40: Generic/fallback match
