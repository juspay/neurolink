[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebLoader

# Class: WebLoader

Web page loader

Fetches and extracts content from web pages.
Supports basic HTML parsing without external dependencies.

## Implements

- [`DocumentLoader`](../type-aliases/DocumentLoader.md)

## Constructors

### Constructor

> **new WebLoader**(): `WebLoader`

#### Returns

`WebLoader`

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](MDocument.md)\>

Load document from source

#### Parameters

##### source

`string`

File path, URL, or content

##### options?

[`WebLoaderOptions`](../type-aliases/WebLoaderOptions.md)

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
