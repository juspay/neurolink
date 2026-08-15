[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedYaml

# Type Alias: ProcessedYaml

> **ProcessedYaml** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:644](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L644)

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
