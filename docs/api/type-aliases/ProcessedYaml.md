[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedYaml

# Type Alias: ProcessedYaml

> **ProcessedYaml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L644)

Processed YAML file result.

## Type Declaration

### content

> **content**: `string`

Original YAML content

### parsed

> **parsed**: `unknown`

Parsed YAML content (as JavaScript object)

### valid

> **valid**: `boolean`

Whether the YAML is syntactically valid

### errorMessage?

> `optional` **errorMessage?**: `string`

Error message if YAML is invalid

### asJson

> **asJson**: `string` \| `null`

YAML content converted to JSON string for AI consumption
