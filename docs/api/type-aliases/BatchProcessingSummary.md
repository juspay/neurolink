[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchProcessingSummary

# Type Alias: BatchProcessingSummary\<T\>

> **BatchProcessingSummary**\<`T`\> = `object`

Summary of batch file processing operations.

## Type Parameters

### T

`T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### totalFiles

> **totalFiles**: `number`

Total number of files attempted

---

### processedFiles

> **processedFiles**: [`ProcessedFileInfo`](ProcessedFileInfo.md)[]

Successfully processed files

---

### failedFiles

> **failedFiles**: [`FailedFileInfo`](FailedFileInfo.md)[]

Files that failed to process

---

### skippedFiles

> **skippedFiles**: [`SkippedFileInfo`](SkippedFileInfo.md)[]

Files that were skipped (e.g., unsupported format)

---

### warnings

> **warnings**: [`FileWarning`](FileWarning.md)[]

Non-fatal warnings

---

### results

> **results**: `T`[]

Processed results (parallel array with processedFiles)
