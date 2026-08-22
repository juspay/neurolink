[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDocuments

# Function: loadDocuments()

> **loadDocuments**(`sources`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)[]\>

Defined in: [rag/document/loaders.ts:674](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L674)

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
