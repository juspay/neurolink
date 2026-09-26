[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

---

### originalName?

> `optional` **originalName?**: `string`

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

---

### typeConfidence

> **typeConfidence**: `number`

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Column name validation issues
