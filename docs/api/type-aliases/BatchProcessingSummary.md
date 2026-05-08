[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchProcessingSummary

# Type Alias: BatchProcessingSummary\<T\>

> **BatchProcessingSummary**\<`T`\> = `object`

Defined in: [types/processor.ts:286](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L286)

Summary of batch file processing operations.

## Type Parameters

### T

`T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### totalFiles

> **totalFiles**: `number`

Defined in: [types/processor.ts:290](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L290)

Total number of files attempted

---

### processedFiles

> **processedFiles**: [`ProcessedFileInfo`](ProcessedFileInfo.md)[]

Defined in: [types/processor.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L292)

Successfully processed files

---

### failedFiles

> **failedFiles**: [`FailedFileInfo`](FailedFileInfo.md)[]

Defined in: [types/processor.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L294)

Files that failed to process

---

### skippedFiles

> **skippedFiles**: [`SkippedFileInfo`](SkippedFileInfo.md)[]

Defined in: [types/processor.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L296)

Files that were skipped (e.g., unsupported format)

---

### warnings

> **warnings**: [`FileWarning`](FileWarning.md)[]

Defined in: [types/processor.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L298)

Non-fatal warnings

---

### results

> **results**: `T`[]

Defined in: [types/processor.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L300)

Processed results (parallel array with processedFiles)
