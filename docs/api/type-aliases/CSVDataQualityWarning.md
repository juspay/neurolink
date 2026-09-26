[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L363)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:364](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L364)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L365)

---

### message

> **message**: `string`

Defined in: [types/file.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L372)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L373)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L374)
