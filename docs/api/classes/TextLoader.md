[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextLoader

# Class: TextLoader

Defined in: [rag/document/loaders.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L56)

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

Defined in: [rag/document/loaders.ts:57](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L57)

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

Defined in: [rag/document/loaders.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L65)

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

Defined in: [rag/document/loaders.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L70)

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

Defined in: [rag/document/loaders.ts:81](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L81)

#### Parameters

##### source

`string`

#### Returns

`string`
