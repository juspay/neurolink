[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Defined in: [types/file.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L283)

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

Defined in: [types/file.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L284)

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

Defined in: [types/file.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L285)

---

### message

> **message**: `string`

Defined in: [types/file.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L292)

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

Defined in: [types/file.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L293)

---

### affectedRows?

> `optional` **affectedRows?**: `number`

Defined in: [types/file.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L294)
