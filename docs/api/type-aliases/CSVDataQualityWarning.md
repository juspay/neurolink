[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L273)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L274)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L275)

---

### message

> **message**: `string`

Defined in: [types/file.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L282)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L283)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L284)
