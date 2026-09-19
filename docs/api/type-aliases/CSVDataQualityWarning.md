[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L256)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L257)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L258)

---

### message

> **message**: `string`

Defined in: [types/file.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L265)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L266)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L267)
