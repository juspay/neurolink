[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVLoader

# Class: CSVLoader

Defined in: [rag/document/loaders.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L154)

CSV file loader

## Extends

- [`TextLoader`](TextLoader.md)

## Constructors

### Constructor

> **new CSVLoader**(): `CSVLoader`

#### Returns

`CSVLoader`

#### Inherited from

[`TextLoader`](TextLoader.md).[`constructor`](TextLoader.md#constructor)

## Methods

### loadContent()

> `protected` **loadContent**(`source`, `encoding?`): `Promise`\<`string`\>

Defined in: [rag/document/loaders.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L70)

#### Parameters

##### source

`string`

##### encoding?

`BufferEncoding` = `"utf-8"`

#### Returns

`Promise`\<`string`\>

#### Inherited from

[`TextLoader`](TextLoader.md).[`loadContent`](TextLoader.md#loadcontent)

---

### getSourceName()

> `protected` **getSourceName**(`source`): `string`

Defined in: [rag/document/loaders.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L81)

#### Parameters

##### source

`string`

#### Returns

`string`

#### Inherited from

[`TextLoader`](TextLoader.md).[`getSourceName`](TextLoader.md#getsourcename)

---

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](MDocument.md)\>

Defined in: [rag/document/loaders.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L155)

Load document from source

#### Parameters

##### source

`string`

File path, URL, or content

##### options?

[`CSVLoaderOptions`](../type-aliases/CSVLoaderOptions.md)

Loader options

#### Returns

`Promise`\<[`MDocument`](MDocument.md)\>

Promise resolving to MDocument

#### Overrides

[`TextLoader`](TextLoader.md).[`load`](TextLoader.md#load)

---

### canHandle()

> **canHandle**(`source`): `boolean`

Defined in: [rag/document/loaders.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/loaders.ts#L245)

Check if loader can handle the source

#### Parameters

##### source

`string`

File path, URL, or content

#### Returns

`boolean`

True if loader can handle the source

#### Overrides

[`TextLoader`](TextLoader.md).[`canHandle`](TextLoader.md#canhandle)
