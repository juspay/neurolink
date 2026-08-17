[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MDocument

# Class: MDocument

Defined in: [rag/document/MDocument.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L47)

MDocument class for comprehensive document processing

Provides a chainable API for:

- Loading documents from various sources
- Chunking with multiple strategies
- Metadata extraction using LLMs
- Embedding generation

## Constructors

### Constructor

> **new MDocument**(`content`, `config?`): `MDocument`

Defined in: [rag/document/MDocument.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L56)

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

Defined in: [rag/document/MDocument.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L82)

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

Defined in: [rag/document/MDocument.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L92)

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

Defined in: [rag/document/MDocument.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L105)

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

Defined in: [rag/document/MDocument.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L115)

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

Defined in: [rag/document/MDocument.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L130)

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

Defined in: [rag/document/MDocument.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L143)

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

Defined in: [rag/document/MDocument.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L156)

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

Defined in: [rag/document/MDocument.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L195)

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

> **embed**(`provider?`, `modelName?`, `imageData?`, `mimeType?`): `Promise`\<`MDocument`\>

Defined in: [rag/document/MDocument.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L256)

Generate embeddings for all chunks

#### Parameters

##### provider?

`string` = `"openai"`

Embedding provider name

##### modelName?

`string` = `"text-embedding-3-small"`

Embedding model name

##### imageData?

(`string` \| `Buffer`\<`ArrayBufferLike`\>)[]

Optional array of image data (Buffer or base64) aligned with chunks,
enabling multi-modal embeddings for providers that support them

##### mimeType?

`string` \| `string`[]

MIME type of the images (default: "image/png"). Pass an
array to declare a per-image MIME type aligned with
`imageData`; a plain string applies to every image.

#### Returns

`Promise`\<`MDocument`\>

This MDocument instance (for chaining)

---

### embedMultiModal()

> **embedMultiModal**(`provider?`, `modelName?`, `imageData?`, `mimeType?`): `Promise`\<`MDocument`\>

Defined in: [rag/document/MDocument.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L327)

Generate multi-modal embeddings for all chunks using text + optional image data.
Uses a provider that supports multi-modal embeddings (e.g. Bedrock Titan Image).

#### Parameters

##### provider?

`string` = `"bedrock"`

Embedding provider name

##### modelName?

`string` = `"amazon.titan-embed-image-v1"`

Embedding model name

##### imageData?

(`string` \| `Buffer`\<`ArrayBufferLike`\>)[]

Optional array of image data (Buffer or base64) aligned with chunks

##### mimeType?

`string` \| `string`[]

MIME type of the images (default: "image/png"). Pass an
array to declare a per-image MIME type aligned with
`imageData`; a plain string applies to every image.

#### Returns

`Promise`\<`MDocument`\>

This MDocument instance (for chaining)

---

### getId()

> **getId**(): `string`

Defined in: [rag/document/MDocument.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L343)

Get document ID

#### Returns

`string`

---

### getContent()

> **getContent**(): `string`

Defined in: [rag/document/MDocument.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L350)

Get raw document content

#### Returns

`string`

---

### getType()

> **getType**(): [`DocumentType`](../type-aliases/DocumentType.md)

Defined in: [rag/document/MDocument.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L357)

Get document type

#### Returns

[`DocumentType`](../type-aliases/DocumentType.md)

---

### getMetadata()

> **getMetadata**(): `Record`\<`string`, `unknown`\>

Defined in: [rag/document/MDocument.ts:364](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L364)

Get document metadata

#### Returns

`Record`\<`string`, `unknown`\>

---

### getChunks()

> **getChunks**(): [`Chunk`](../type-aliases/Chunk.md)[]

Defined in: [rag/document/MDocument.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L371)

Get processed chunks

#### Returns

[`Chunk`](../type-aliases/Chunk.md)[]

---

### getEmbeddings()

> **getEmbeddings**(): `number`[][]

Defined in: [rag/document/MDocument.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L378)

Get chunk embeddings

#### Returns

`number`[][]

---

### getHistory()

> **getHistory**(): `string`[]

Defined in: [rag/document/MDocument.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L385)

Get processing history

#### Returns

`string`[]

---

### isChunked()

> **isChunked**(): `boolean`

Defined in: [rag/document/MDocument.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L392)

Check if document has been chunked

#### Returns

`boolean`

---

### hasEmbeddings()

> **hasEmbeddings**(): `boolean`

Defined in: [rag/document/MDocument.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L399)

Check if document has embeddings

#### Returns

`boolean`

---

### getChunkCount()

> **getChunkCount**(): `number`

Defined in: [rag/document/MDocument.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L406)

Get chunk count

#### Returns

`number`

---

### setMetadata()

> **setMetadata**(`key`, `value`): `MDocument`

Defined in: [rag/document/MDocument.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L420)

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

Defined in: [rag/document/MDocument.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L430)

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

Defined in: [rag/document/MDocument.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L440)

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

Defined in: [rag/document/MDocument.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L458)

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

Defined in: [rag/document/MDocument.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L476)

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

Defined in: [rag/document/MDocument.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/rag/document/MDocument.ts#L499)

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
