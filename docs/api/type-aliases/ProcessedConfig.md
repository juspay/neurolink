[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedConfig

# Type Alias: ProcessedConfig

> **ProcessedConfig** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L560)

Processed configuration file result.

## Type Declaration

### content

> **content**: `string`

The configuration file content with redacted sensitive values

### format

> **format**: `"env"` \| `"ini"` \| `"toml"` \| `"properties"` \| `"unknown"`

Detected configuration format

### keyValues

> **keyValues**: `Record`\<`string`, `string`\>

Extracted key-value pairs (with sensitive values redacted)

### redactedKeys

> **redactedKeys**: `string`[]

List of keys that were redacted for security
