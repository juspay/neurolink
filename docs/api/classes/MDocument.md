[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MDocument

# Class: MDocument

Defined in: [rag/document/MDocument.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L46)

MDocument class for comprehensive document processing

Provides a chainable API for:

- Loading documents from various sources
- Chunking with multiple strategies
- Metadata extraction using LLMs
- Embedding generation

## Constructors

### Constructor

> **new MDocument**(`content`, `config?`): `MDocument`

Defined in: [rag/document/MDocument.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L55)

Create a new MDocument instance

#### Parameters

##### content

`string`

Document content

##### config?

[`MDocumentConfig`](../type-aliases/MDocumentConfig.md)

Document configuration

#### Returns

`MDocument`

## Methods

### fromText()

> `static` **fromText**(`text`, `metadata?`): `MDocument`

Defined in: [rag/document/MDocument.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L81)

Create MDocument from plain text

#### Parameters

##### text

`string`

Plain text content

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`MDocument`

MDocument instance

---

### fromMarkdown()

> `static` **fromMarkdown**(`markdown`, `metadata?`): `MDocument`

Defined in: [rag/document/MDocument.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L91)

Create MDocument from markdown content

#### Parameters

##### markdown

`string`

Markdown content

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`MDocument`

MDocument instance

---

### fromHTML()

> `static` **fromHTML**(`html`, `metadata?`): `MDocument`

Defined in: [rag/document/MDocument.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L104)

Create MDocument from HTML content

#### Parameters

##### html

`string`

HTML content

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`MDocument`

MDocument instance

---

### fromJSONContent()

> `static` **fromJSONContent**(`json`, `metadata?`): `MDocument`

Defined in: [rag/document/MDocument.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L114)

Create MDocument from JSON content

#### Parameters

##### json

`string` \| `object`

JSON string or object

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`MDocument`

MDocument instance

---

### fromLaTeX()

> `static` **fromLaTeX**(`latex`, `metadata?`): `MDocument`

Defined in: [rag/document/MDocument.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L129)

Create MDocument from LaTeX content

#### Parameters

##### latex

`string`

LaTeX content

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`MDocument`

MDocument instance

---

### fromCSV()

> `static` **fromCSV**(`csv`, `metadata?`): `MDocument`

Defined in: [rag/document/MDocument.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L142)

Create MDocument from CSV content

#### Parameters

##### csv

`string`

CSV content

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`MDocument`

MDocument instance

---

### chunk()

> **chunk**(`params?`): `Promise`\<`MDocument`\>

Defined in: [rag/document/MDocument.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L155)

Chunk the document using specified strategy

#### Parameters

##### params?

[`ChunkParams`](../type-aliases/ChunkParams.md)

Chunking parameters

#### Returns

`Promise`\<`MDocument`\>

This MDocument instance (for chaining)

---

### extractMetadata()

> **extractMetadata**(`params`, `options?`): `Promise`\<`MDocument`\>

Defined in: [rag/document/MDocument.ts:194](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L194)

Extract metadata from chunks using LLM

#### Parameters

##### params

[`ExtractParams`](../type-aliases/ExtractParams.md)

Extraction parameters

##### options?

Extractor options

###### provider?

`string`

###### modelName?

`string`

#### Returns

`Promise`\<`MDocument`\>

This MDocument instance (for chaining)

---

### embed()

> **embed**(`provider?`, `modelName?`): `Promise`\<`MDocument`\>

Defined in: [rag/document/MDocument.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L250)

Generate embeddings for all chunks

#### Parameters

##### provider?

`string` = `"openai"`

Embedding provider name

##### modelName?

`string` = `"text-embedding-3-small"`

Embedding model name

#### Returns

`Promise`\<`MDocument`\>

This MDocument instance (for chaining)

---

### getId()

> **getId**(): `string`

Defined in: [rag/document/MDocument.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L305)

Get document ID

#### Returns

`string`

---

### getContent()

> **getContent**(): `string`

Defined in: [rag/document/MDocument.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L312)

Get raw document content

#### Returns

`string`

---

### getType()

> **getType**(): [`DocumentType`](../type-aliases/DocumentType.md)

Defined in: [rag/document/MDocument.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L319)

Get document type

#### Returns

[`DocumentType`](../type-aliases/DocumentType.md)

---

### getMetadata()

> **getMetadata**(): `Record`\<`string`, `unknown`\>

Defined in: [rag/document/MDocument.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L326)

Get document metadata

#### Returns

`Record`\<`string`, `unknown`\>

---

### getChunks()

> **getChunks**(): [`Chunk`](../type-aliases/Chunk.md)[]

Defined in: [rag/document/MDocument.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L333)

Get processed chunks

#### Returns

[`Chunk`](../type-aliases/Chunk.md)[]

---

### getEmbeddings()

> **getEmbeddings**(): `number`[][]

Defined in: [rag/document/MDocument.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L340)

Get chunk embeddings

#### Returns

`number`[][]

---

### getHistory()

> **getHistory**(): `string`[]

Defined in: [rag/document/MDocument.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L347)

Get processing history

#### Returns

`string`[]

---

### isChunked()

> **isChunked**(): `boolean`

Defined in: [rag/document/MDocument.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L354)

Check if document has been chunked

#### Returns

`boolean`

---

### hasEmbeddings()

> **hasEmbeddings**(): `boolean`

Defined in: [rag/document/MDocument.ts:361](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L361)

Check if document has embeddings

#### Returns

`boolean`

---

### getChunkCount()

> **getChunkCount**(): `number`

Defined in: [rag/document/MDocument.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L368)

Get chunk count

#### Returns

`number`

---

### setMetadata()

> **setMetadata**(`key`, `value`): `MDocument`

Defined in: [rag/document/MDocument.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L382)

Set document metadata

#### Parameters

##### key

`string`

Metadata key

##### value

`unknown`

Metadata value

#### Returns

`MDocument`

This MDocument instance (for chaining)

---

### mergeMetadata()

> **mergeMetadata**(`metadata`): `MDocument`

Defined in: [rag/document/MDocument.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L392)

Merge metadata into document

#### Parameters

##### metadata

`Record`\<`string`, `unknown`\>

Metadata to merge

#### Returns

`MDocument`

This MDocument instance (for chaining)

---

### filterChunks()

> **filterChunks**(`predicate`): `MDocument`

Defined in: [rag/document/MDocument.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L402)

Filter chunks based on predicate

#### Parameters

##### predicate

(`chunk`) => `boolean`

Filter function

#### Returns

`MDocument`

New MDocument with filtered chunks

---

### mapChunks()

> **mapChunks**(`transform`): `MDocument`

Defined in: [rag/document/MDocument.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L420)

Map transformation over chunks

#### Parameters

##### transform

(`chunk`) => [`Chunk`](../type-aliases/Chunk.md)

Transform function

#### Returns

`MDocument`

New MDocument with transformed chunks

---

### toJSON()

> **toJSON**(): `object`

Defined in: [rag/document/MDocument.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L438)

Convert to plain object for serialization

#### Returns

`object`

##### id

> **id**: `string`

##### content

> **content**: `string`

##### type

> **type**: [`DocumentType`](../type-aliases/DocumentType.md)

##### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

##### chunks

> **chunks**: [`Chunk`](../type-aliases/Chunk.md)[]

##### history

> **history**: `string`[]

---

### fromJSON()

> `static` **fromJSON**(`json`): `MDocument`

Defined in: [rag/document/MDocument.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L461)

Create MDocument from serialized JSON

#### Parameters

##### json

Serialized document data

###### id?

`string`

###### content

`string`

###### type

[`DocumentType`](../type-aliases/DocumentType.md)

###### metadata?

`Record`\<`string`, `unknown`\>

###### chunks?

[`Chunk`](../type-aliases/Chunk.md)[]

###### history?

`string`[]

#### Returns

`MDocument`

MDocument instance
