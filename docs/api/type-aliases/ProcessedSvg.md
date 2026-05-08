[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedSvg

# Type Alias: ProcessedSvg

> **ProcessedSvg** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:498](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L498)

Processed SVG result.
Extends ProcessedFileBase with SVG-specific fields.

## Type Declaration

### textContent

> **textContent**: `string`

Sanitized SVG content as text for AI processing

### rawContent?

> `optional` **rawContent?**: `string`

Original raw content (only included if sanitization modified the content)

### sanitized

> **sanitized**: `boolean`

Whether sanitization was applied to the content

### securityWarnings

> **securityWarnings**: `string`[]

Security warnings found during processing
