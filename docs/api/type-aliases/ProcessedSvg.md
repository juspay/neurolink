[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedSvg

# Type Alias: ProcessedSvg

> **ProcessedSvg** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:498](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L498)

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
