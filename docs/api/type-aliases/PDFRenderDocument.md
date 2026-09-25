[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFRenderDocument

# Type Alias: PDFRenderDocument

> **PDFRenderDocument** = `object`

Defined in: [types/file.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L652)

A PDF opened for page rendering. Rendering goes through pdf-parse so the
process loads exactly one pdfjs-dist copy — a second copy fails pdfjs's
API-vs-Worker version check for whichever library loads second.

## Properties

### length

> **length**: `number`

Defined in: [types/file.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L654)

Total pages in the document.

---

### getPage

> **getPage**: (`pageNumber`) => `Promise`\<`Buffer`\>

Defined in: [types/file.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L656)

Render a 1-based page to a PNG buffer.

#### Parameters

##### pageNumber

`number`

#### Returns

`Promise`\<`Buffer`\>

---

### destroy

> **destroy**: () => `Promise`\<`void`\>

Defined in: [types/file.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L658)

Release pdfjs resources held by the document.

#### Returns

`Promise`\<`void`\>
