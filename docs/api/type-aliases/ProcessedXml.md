[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedXml

# Type Alias: ProcessedXml

> **ProcessedXml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

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
