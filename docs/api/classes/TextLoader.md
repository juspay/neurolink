[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextLoader

# Class: TextLoader

Defined in: [rag/document/loaders.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L44)

Text file loader

## Extended by

- [`CSVLoader`](CSVLoader.md)
- [`HTMLLoader`](HTMLLoader.md)
- [`JSONLoader`](JSONLoader.md)
- [`MarkdownLoader`](MarkdownLoader.md)

## Implements

- [`DocumentLoader`](../type-aliases/DocumentLoader.md)

## Constructors

### Constructor

> **new TextLoader**(): `TextLoader`

#### Returns

`TextLoader`

## Methods

### load()

> **load**(`source`, `options?`): `Promise`\<[`MDocument`](MDocument.md)\>

Defined in: [rag/document/loaders.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L45)

Load document from source

#### Parameters

##### source

`string`

File path, URL, or content

##### options?

[`LoaderOptions`](../type-aliases/LoaderOptions.md)

Loader options

#### Returns

`Promise`\<[`MDocument`](MDocument.md)\>

Promise resolving to MDocument

#### Implementation of

`DocumentLoader.load`

---

### canHandle()

> **canHandle**(`source`): `boolean`

Defined in: [rag/document/loaders.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L53)

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

---

### loadContent()

> `protected` **loadContent**(`source`, `encoding?`): `Promise`\<`string`\>

Defined in: [rag/document/loaders.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L58)

#### Parameters

##### source

`string`

##### encoding?

`BufferEncoding` = `"utf-8"`

#### Returns

`Promise`\<`string`\>

---

### getSourceName()

> `protected` **getSourceName**(`source`): `string`

Defined in: [rag/document/loaders.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L69)

#### Parameters

##### source

`string`

#### Returns

`string`
