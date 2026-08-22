[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownLoader

# Class: MarkdownLoader

Defined in: [rag/document/loaders.ts:89](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L89)

Markdown file loader

## Extends

- [`TextLoader`](TextLoader.md)

## Constructors

### Constructor

> **new MarkdownLoader**(): `MarkdownLoader`

#### Returns

`MarkdownLoader`

#### Inherited from

[`TextLoader`](TextLoader.md).[`constructor`](TextLoader.md#constructor)

## Methods

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

#### Inherited from

[`TextLoader`](TextLoader.md).[`loadContent`](TextLoader.md#loadcontent)

---

### getSourceName()

> `protected` **getSourceName**(`source`): `string`

Defined in: [rag/document/loaders.ts:81](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L81)

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

Defined in: [rag/document/loaders.ts:90](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L90)

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

#### Overrides

[`TextLoader`](TextLoader.md).[`load`](TextLoader.md#load)

---

### canHandle()

> **canHandle**(`source`): `boolean`

Defined in: [rag/document/loaders.ts:98](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/document/loaders.ts#L98)

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
