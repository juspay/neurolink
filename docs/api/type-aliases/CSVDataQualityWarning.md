[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L343)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L344)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L345)

---

### message

> **message**: `string`

Defined in: [types/file.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L352)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L353)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L354)
