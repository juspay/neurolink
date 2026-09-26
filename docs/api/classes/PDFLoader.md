[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFLoader

# Class: PDFLoader

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
