[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedMarkdown

# Type Alias: ProcessedMarkdown

> **ProcessedMarkdown** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:528](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L528)

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
