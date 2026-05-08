[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DocumentLoader

# Type Alias: DocumentLoader

> **DocumentLoader** = `object`

Defined in: [types/rag.ts:559](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L559)

Abstract document loader type

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)\>

Defined in: [types/rag.ts:566](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L566)

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

Defined in: [types/rag.ts:576](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L576)

Check if loader can handle the source

#### Parameters

##### source

`string`

File path, URL, or content

#### Returns

`boolean`

True if loader can handle the source
