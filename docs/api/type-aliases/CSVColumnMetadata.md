[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L170)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L171)

---

### index

> **index**: `number`

Defined in: [types/file.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L172)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L173)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L175)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L177)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L179)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L181)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L183)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L185)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:187](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L187)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L189)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L191)

Column name validation issues
