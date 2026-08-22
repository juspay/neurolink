[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDocuments

# Function: loadDocuments()

> **loadDocuments**(`sources`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)[]\>

Defined in: [rag/document/loaders.ts:674](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L674)

Load multiple documents

## Parameters

### sources

`string`[]

Array of file paths, URLs, or content

### options?

[`LoaderOptions`](../type-aliases/LoaderOptions.md)

Loader options (applied to all)

## Returns

`Promise`\<[`MDocument`](../classes/MDocument.md)[]\>

Promise resolving to array of MDocuments
