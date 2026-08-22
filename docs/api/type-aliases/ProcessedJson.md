[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedJson

# Type Alias: ProcessedJson

> **ProcessedJson** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:588](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L588)

Processed JSON file result.

## Type Declaration

### content

> **content**: `string`

Pretty-printed JSON content (or original content if invalid)

### rawContent

> **rawContent**: `string`

Original raw content before pretty-printing

### parsed

> **parsed**: `unknown`

Parsed JSON object/array/value

### valid

> **valid**: `boolean`

Whether the JSON is syntactically valid

### errorMessage?

> `optional` **errorMessage?**: `string`

Error message if JSON is invalid

### keyCount?

> `optional` **keyCount?**: `number`

Number of top-level keys (for objects)

### arrayLength?

> `optional` **arrayLength?**: `number`

Length of the array (for arrays)

### truncated

> **truncated**: `boolean`

Whether content was truncated
