[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextLoader

# Class: TextLoader

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

#### Parameters

##### source

`string`

#### Returns

`string`
