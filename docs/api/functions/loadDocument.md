[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDocument

# Function: loadDocument()

> **loadDocument**(`source`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)\>

Defined in: [rag/document/loaders.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L647)

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
