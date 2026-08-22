[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L245)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L246)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L247)

---

### message

> **message**: `string`

Defined in: [types/file.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L254)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L255)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L256)
