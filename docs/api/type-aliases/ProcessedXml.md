[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedXml

# Type Alias: ProcessedXml

> **ProcessedXml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:512](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L512)

Processed XML file result.

## Type Declaration

### content

> **content**: `string`

Original XML content

### parsed

> **parsed**: `unknown`

Parsed XML content (as JavaScript object)

### valid

> **valid**: `boolean`

Whether the XML is syntactically valid

### errorMessage?

> `optional` **errorMessage?**: `string`

Error message if XML is invalid

### rootElement?

> `optional` **rootElement?**: `string`

Name of the root element
