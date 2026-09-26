[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVDataQualityWarning

# Type Alias: CSVDataQualityWarning

> **CSVDataQualityWarning** = `object`

Data quality warning for CSV columns

## Properties

### column

> **column**: `string`

---

### type

> **type**: `"empty_values"` \| `"invalid_name"` \| `"mixed_types"` \| `"high_null_rate"` \| `"duplicates"` \| `"inconsistent_format"`

---

### message

> **message**: `string`

---

### severity

> **severity**: `"info"` \| `"warning"` \| `"error"`

---

### affectedRows?

> `optional` **affectedRows?**: `number`
