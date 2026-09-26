[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L433)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L434)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L435)

---

### message

> **message**: `string`

Defined in: [types/file.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L442)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L443)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L444)
