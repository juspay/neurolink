[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFLoader

# Class: PDFLoader

Defined in: [rag/document/loaders.ts:247](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L247)

PDF file loader

Note: Requires external PDF processing library for full functionality.
Falls back to placeholder implementation if pdf-parse is not available.

## Implements

- [`DocumentLoader`](../type-aliases/DocumentLoader.md)

## Constructors

### Constructor

> **new PDFLoader**(): `PDFLoader`

#### Returns

`PDFLoader`

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](MDocument.md)\>

Defined in: [rag/document/loaders.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L248)

Load document from source

#### Parameters

##### source

`string`

File path, URL, or content

##### options?

[`PDFLoaderOptions`](../type-aliases/PDFLoaderOptions.md)

Loader options

#### Returns

`Promise`\<[`MDocument`](MDocument.md)\>

Promise resolving to MDocument

#### Implementation of

`DocumentLoader.load`

---

### canHandle()

> **canHandle**(`source`): `boolean`

Defined in: [rag/document/loaders.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L309)

Check if loader can handle the source

#### Parameters

##### source

`string`

File path, URL, or content

#### Returns

`boolean`

True if loader can handle the source

#### Implementation of

`DocumentLoader.canHandle`
