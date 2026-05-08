[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVLoader

# Class: CSVLoader

Defined in: [rag/document/loaders.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L142)

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

Defined in: [rag/document/loaders.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L58)

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

Defined in: [rag/document/loaders.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L69)

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

Defined in: [rag/document/loaders.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L143)

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

Defined in: [rag/document/loaders.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/document/loaders.ts#L190)

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
