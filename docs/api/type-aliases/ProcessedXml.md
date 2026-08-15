[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedXml

# Type Alias: ProcessedXml

> **ProcessedXml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:512](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L512)

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
