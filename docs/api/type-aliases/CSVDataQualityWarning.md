[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L405)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L406)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:407](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L407)

---

### message

> **message**: `string`

Defined in: [types/file.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L414)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L415)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:416](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L416)
