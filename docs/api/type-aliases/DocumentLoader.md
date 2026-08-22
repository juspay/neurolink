[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DocumentLoader

# Type Alias: DocumentLoader

> **DocumentLoader** = `object`

Defined in: [types/rag.ts:606](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L606)

Abstract document loader type

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](../classes/MDocument.md)\>

Defined in: [types/rag.ts:613](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L613)

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

Defined in: [types/rag.ts:623](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L623)

Check if loader can handle the source

#### Parameters

##### source

`string`

File path, URL, or content

#### Returns

`boolean`

True if loader can handle the source
