[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileReference

# Type Alias: FileReference

> **FileReference** = `object`

A lightweight reference to a file registered for on-demand processing.

Registration is fast (~1ms): only stat + magic bytes + first 1KB preview.
Full processing is deferred until the LLM requests it via tools.

## Properties

### id

> **id**: `string`

Unique identifier (UUID v4)

---

### source

> **source**: [`FileSource`](FileSource.md)

How the file was provided

---

### originalPath?

> `optional` **originalPath?**: `string`

Original file path or URL

---

### filename

> **filename**: `string`

Display name

---

### sizeBytes

> **sizeBytes**: `number`

Original file size in bytes

---

### detectedType

> **detectedType**: [`FileType`](FileType.md)

Detected file type from magic bytes / extension

---

### mimeType

> **mimeType**: `string`

Detected MIME type

---

### sizeTier

> **sizeTier**: [`SizeTier`](SizeTier.md)

Size tier determining processing strategy

---

### estimatedTokens

> **estimatedTokens**: `number`

Estimated tokens after processing (type-aware)

---

### preview

> **preview**: `string`

First ~500 tokens of content (lightweight preview)

---

### status

> **status**: [`FileReferenceStatus`](FileReferenceStatus.md)

Current processing status

---

### summary?

> `optional` **summary?**: `string`

LLM-generated summary (populated lazily via summarize_file tool)

---

### outlineSections?

> `optional` **outlineSections?**: [`OutlineSection`](OutlineSection.md)[]

Structural outline for code/docs (populated lazily)

---

### tempPath?

> `optional` **tempPath?**: `string`

Path in temp directory where buffer is persisted

---

### providerId?

> `optional` **providerId?**: `string`

Provider file API ID (for Anthropic Files API, Gemini File API, etc.)

---

### processedContent?

> `optional` **processedContent?**: `string`

Full processed content (cached after first full processing)

---

### extractedImages?

> `optional` **extractedImages?**: `Buffer`[]

Extracted images (e.g., video keyframes, PPTX slide images)

---

### registeredAt

> **registeredAt**: `number`

Timestamp when the file was registered

---

### lastAccessedAt

> **lastAccessedAt**: `number`

Timestamp when the file was last accessed (for LRU eviction)

---

### totalLines?

> `optional` **totalLines?**: `number`

Total line count (for text files, populated on first read)

---

### extension?

> `optional` **extension?**: `string`

File extension (e.g., 'py', 'xlsx', 'mp4')
