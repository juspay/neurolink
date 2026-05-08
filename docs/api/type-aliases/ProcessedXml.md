[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedXml

# Type Alias: ProcessedXml

> **ProcessedXml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:512](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L512)

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
