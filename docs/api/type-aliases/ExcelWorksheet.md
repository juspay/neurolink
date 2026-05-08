[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExcelWorksheet

# Type Alias: ExcelWorksheet

> **ExcelWorksheet** = `object`

Defined in: [types/processor.ts:726](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L726)

Single worksheet extracted from an Excel file.

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:728](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L728)

Name of the worksheet (tab name in Excel)

---

### rows

> **rows**: (`string` \| `number` \| `boolean` \| `null`)[][]

Defined in: [types/processor.ts:730](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L730)

Row data as a 2D array. Each inner array represents a row.

---

### headers

> **headers**: `string`[]

Defined in: [types/processor.ts:732](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L732)

Headers extracted from the first row

---

### rowCount

> **rowCount**: `number`

Defined in: [types/processor.ts:734](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L734)

Number of rows extracted (may be less than actual if truncated)

---

### columnCount

> **columnCount**: `number`

Defined in: [types/processor.ts:736](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L736)

Number of columns (based on headers or first row)
