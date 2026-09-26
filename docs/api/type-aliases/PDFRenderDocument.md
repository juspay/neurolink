[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFRenderDocument

# Type Alias: PDFRenderDocument

> **PDFRenderDocument** = `object`

Defined in: [types/file.ts:848](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L848)

A PDF opened for page rendering. Rendering goes through pdf-parse so the
process loads exactly one pdfjs-dist copy — a second copy fails pdfjs's
API-vs-Worker version check for whichever library loads second.

## Properties

### length

> **length**: `number`

Defined in: [types/file.ts:850](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L850)

Total pages in the document.

---

### getPage

> **getPage**: (`pageNumber`) => `Promise`\<`Buffer`\>

Defined in: [types/file.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L852)

Render a 1-based page to a PNG buffer.

#### Parameters

##### pageNumber

`number`

#### Returns

`Promise`\<`Buffer`\>

---

### destroy

> **destroy**: () => `Promise`\<`void`\>

Defined in: [types/file.ts:854](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L854)

Release pdfjs resources held by the document.

#### Returns

`Promise`\<`void`\>
