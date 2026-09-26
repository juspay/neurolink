[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorMatch

# Type Alias: ProcessorMatch\<\_T\>

> **ProcessorMatch**\<`_T`\> = `object`

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

Name of the matched processor

---

### processor

> **processor**: `unknown`

The processor instance

---

### priority

> **priority**: `number`

Priority level of this processor

---

### confidence

> **confidence**: `number`

Confidence score for the match (0-100).
Higher values indicate better match quality:

- 100: Exact MIME type match
- 80: MIME type prefix match (e.g., "image/\*")
- 60: File extension match
- 40: Generic/fallback match
