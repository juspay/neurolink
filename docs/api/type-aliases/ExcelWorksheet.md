[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExcelWorksheet

# Type Alias: ExcelWorksheet

> **ExcelWorksheet** = `object`

Single worksheet extracted from an Excel file.

## Properties

### name

> **name**: `string`

Name of the worksheet (tab name in Excel)

---

### rows

> **rows**: (`string` \| `number` \| `boolean` \| `null`)[][]

Row data as a 2D array. Each inner array represents a row.

---

### headers

> **headers**: `string`[]

Headers extracted from the first row

---

### rowCount

> **rowCount**: `number`

Number of rows extracted (may be less than actual if truncated)

---

### columnCount

> **columnCount**: `number`

Number of columns (based on headers or first row)
