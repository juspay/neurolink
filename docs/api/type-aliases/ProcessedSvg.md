[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedSvg

# Type Alias: ProcessedSvg

> **ProcessedSvg** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

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
