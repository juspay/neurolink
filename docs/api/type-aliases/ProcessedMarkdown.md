[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedMarkdown

# Type Alias: ProcessedMarkdown

> **ProcessedMarkdown** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:528](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L528)

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
