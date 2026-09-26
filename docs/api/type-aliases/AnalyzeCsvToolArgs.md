[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyzeCsvToolArgs

# Type Alias: AnalyzeCsvToolArgs

> **AnalyzeCsvToolArgs** = `object`

Defined in: [types/tools.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L499)

Arguments of the built-in analyzeCSV tool, after schema defaults.

## Properties

### filePath

> **filePath**: `string`

Defined in: [types/tools.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L500)

---

### operation

> **operation**: `"count_by_column"` \| `"sum_by_column"` \| `"average_by_column"` \| `"min_max_by_column"` \| `"describe"`

Defined in: [types/tools.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L501)

---

### column

> **column**: `string`

Defined in: [types/tools.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L507)

---

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/tools.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L508)
