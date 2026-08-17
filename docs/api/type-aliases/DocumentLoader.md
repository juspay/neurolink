[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DocumentLoader

# Type Alias: DocumentLoader

> **DocumentLoader** = `object`

Defined in: [types/rag.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L625)

Abstract document loader type

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)\>

Defined in: [types/rag.ts:632](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L632)

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

Defined in: [types/rag.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L642)

Check if loader can handle the source

#### Parameters

##### source

`string`

File path, URL, or content

#### Returns

`boolean`

True if loader can handle the source
