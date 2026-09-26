[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedMarkdown

# Type Alias: ProcessedMarkdown

> **ProcessedMarkdown** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Processed Markdown result.

## Type Declaration

### content

> **content**: `string`

Original Markdown content

### lineCount

> **lineCount**: `number`

Total number of lines in the document

### hasCodeBlocks

> **hasCodeBlocks**: `boolean`

Whether the document contains fenced code blocks

### hasTables

> **hasTables**: `boolean`

Whether the document contains Markdown tables

### headings

> **headings**: `string`[]

List of headings extracted from the document
