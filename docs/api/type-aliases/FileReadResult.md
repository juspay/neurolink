[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileReadResult

# Type Alias: FileReadResult

> **FileReadResult** = `object`

Result of reading a file section

## Properties

### content

> **content**: `string`

The content that was read

---

### startLine

> **startLine**: `number`

Starting line number (1-indexed)

---

### endLine

> **endLine**: `number`

Ending line number (1-indexed)

---

### totalLines

> **totalLines**: `number`

Total lines in the file

---

### truncated

> **truncated**: `boolean`

Whether the content was truncated to fit token budget

---

### estimatedTokens

> **estimatedTokens**: `number`

Number of tokens in the returned content
