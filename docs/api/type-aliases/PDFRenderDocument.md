[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFRenderDocument

# Type Alias: PDFRenderDocument

> **PDFRenderDocument** = `object`

A PDF opened for page rendering. Rendering goes through pdf-parse so the
process loads exactly one pdfjs-dist copy — a second copy fails pdfjs's
API-vs-Worker version check for whichever library loads second.

## Properties

### length

> **length**: `number`

Total pages in the document.

---

### getPage

> **getPage**: (`pageNumber`) => `Promise`\<`Buffer`\>

Render a 1-based page to a PNG buffer.

#### Parameters

##### pageNumber

`number`

#### Returns

`Promise`\<`Buffer`\>

---

### destroy

> **destroy**: () => `Promise`\<`void`\>

Release pdfjs resources held by the document.

#### Returns

`Promise`\<`void`\>
