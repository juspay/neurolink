[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDocuments

# Function: loadDocuments()

> **loadDocuments**(`sources`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)[]\>

Defined in: [rag/document/loaders.ts:651](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L651)

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
