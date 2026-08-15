[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTMLLoader

# Class: HTMLLoader

Defined in: [rag/document/loaders.ts:104](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L104)

HTML file loader

## Extends

- [`TextLoader`](TextLoader.md)

## Constructors

### Constructor

> **new HTMLLoader**(): `HTMLLoader`

#### Returns

`HTMLLoader`

#### Inherited from

[`TextLoader`](TextLoader.md).[`constructor`](TextLoader.md#constructor)

## Methods

### loadContent()

> `protected` **loadContent**(`source`, `encoding?`): `Promise`\<`string`\>

Defined in: [rag/document/loaders.ts:67](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L67)

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

Defined in: [rag/document/loaders.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L78)

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

Defined in: [rag/document/loaders.ts:105](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L105)

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

Defined in: [rag/document/loaders.ts:113](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/document/loaders.ts#L113)

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
