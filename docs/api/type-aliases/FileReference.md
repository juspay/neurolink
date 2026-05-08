[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileReference

# Type Alias: FileReference

> **FileReference** = `object`

Defined in: [types/fileReference.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L63)

A lightweight reference to a file registered for on-demand processing.

Registration is fast (~1ms): only stat + magic bytes + first 1KB preview.
Full processing is deferred until the LLM requests it via tools.

## Properties

### id

> **id**: `string`

Defined in: [types/fileReference.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L65)

Unique identifier (UUID v4)

---

### source

> **source**: [`FileSource`](FileSource.md)

Defined in: [types/fileReference.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L67)

How the file was provided

---

### originalPath?

> `optional` **originalPath?**: `string`

Defined in: [types/fileReference.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L69)

Original file path or URL

---

### filename

> **filename**: `string`

Defined in: [types/fileReference.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L71)

Display name

---

### sizeBytes

> **sizeBytes**: `number`

Defined in: [types/fileReference.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L73)

Original file size in bytes

---

### detectedType

> **detectedType**: [`FileType`](FileType.md)

Defined in: [types/fileReference.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L75)

Detected file type from magic bytes / extension

---

### mimeType

> **mimeType**: `string`

Defined in: [types/fileReference.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L77)

Detected MIME type

---

### sizeTier

> **sizeTier**: [`SizeTier`](SizeTier.md)

Defined in: [types/fileReference.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L79)

Size tier determining processing strategy

---

### estimatedTokens

> **estimatedTokens**: `number`

Defined in: [types/fileReference.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L81)

Estimated tokens after processing (type-aware)

---

### preview

> **preview**: `string`

Defined in: [types/fileReference.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L83)

First ~500 tokens of content (lightweight preview)

---

### status

> **status**: [`FileReferenceStatus`](FileReferenceStatus.md)

Defined in: [types/fileReference.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L85)

Current processing status

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/fileReference.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L87)

LLM-generated summary (populated lazily via summarize_file tool)

---

### outlineSections?

> `optional` **outlineSections?**: [`OutlineSection`](OutlineSection.md)[]

Defined in: [types/fileReference.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L89)

Structural outline for code/docs (populated lazily)

---

### tempPath?

> `optional` **tempPath?**: `string`

Defined in: [types/fileReference.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L91)

Path in temp directory where buffer is persisted

---

### providerId?

> `optional` **providerId?**: `string`

Defined in: [types/fileReference.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L93)

Provider file API ID (for Anthropic Files API, Gemini File API, etc.)

---

### processedContent?

> `optional` **processedContent?**: `string`

Defined in: [types/fileReference.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L95)

Full processed content (cached after first full processing)

---

### extractedImages?

> `optional` **extractedImages?**: `Buffer`[]

Defined in: [types/fileReference.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L97)

Extracted images (e.g., video keyframes, PPTX slide images)

---

### registeredAt

> **registeredAt**: `number`

Defined in: [types/fileReference.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L99)

Timestamp when the file was registered

---

### lastAccessedAt

> **lastAccessedAt**: `number`

Defined in: [types/fileReference.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L101)

Timestamp when the file was last accessed (for LRU eviction)

---

### totalLines?

> `optional` **totalLines?**: `number`

Defined in: [types/fileReference.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L103)

Total line count (for text files, populated on first read)

---

### extension?

> `optional` **extension?**: `string`

Defined in: [types/fileReference.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L105)

File extension (e.g., 'py', 'xlsx', 'mp4')
