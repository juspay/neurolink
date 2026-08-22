[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedHtml

# Type Alias: ProcessedHtml

> **ProcessedHtml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:626](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L626)

Processed HTML file result.

## Type Declaration

### content

> **content**: `string`

Original HTML content

### textContent

> **textContent**: `string`

Text extracted from HTML (all tags stripped)

### hasScripts

> **hasScripts**: `boolean`

Whether the HTML contains script tags

### hasStyles

> **hasStyles**: `boolean`

Whether the HTML contains style tags

### title?

> `optional` **title?**: `string`

Page title extracted from title tag, if present

### hasDangerousContent

> **hasDangerousContent**: `boolean`

Whether the HTML contains potentially dangerous content (XSS vectors)
