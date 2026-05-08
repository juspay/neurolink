[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDocuments

# Function: loadDocuments()

> **loadDocuments**(`sources`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)[]\>

Defined in: [rag/document/loaders.ts:590](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L590)

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
