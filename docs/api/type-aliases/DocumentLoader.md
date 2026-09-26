[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DocumentLoader

# Type Alias: DocumentLoader

> **DocumentLoader** = `object`

Abstract document loader type

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)\>

Load document from source

#### Parameters

##### source

`string`

File path, URL, or content

##### options?

[`LoaderOptions`](LoaderOptions.md)

Loader options

#### Returns

`Promise`\<[`MDocument`](../classes/MDocument.md)\>

Promise resolving to MDocument

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
