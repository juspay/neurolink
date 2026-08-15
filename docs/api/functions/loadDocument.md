[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDocument

# Function: loadDocument()

> **loadDocument**(`source`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)\>

Defined in: [rag/document/loaders.ts:624](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L624)

Load document from file path, URL, or content

Automatically detects the document type and uses the appropriate loader.

## Parameters

### source

`string`

File path, URL, or raw content

### options?

[`LoaderOptions`](../type-aliases/LoaderOptions.md)

Loader options

## Returns

`Promise`\<[`MDocument`](../classes/MDocument.md)\>

Promise resolving to MDocument

## Example

```typescript
// Load from file
const doc = await loadDocument("/path/to/document.md");

// Load from URL
const webDoc = await loadDocument("https://example.com/article");

// Load with options
const pdfDoc = await loadDocument("/path/to/doc.pdf", {
  pageRange: "1-5",
  metadata: { project: "research" },
});
```
