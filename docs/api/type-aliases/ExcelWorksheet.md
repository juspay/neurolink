[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExcelWorksheet

# Type Alias: ExcelWorksheet

> **ExcelWorksheet** = `object`

Defined in: [types/processor.ts:726](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L726)

Single worksheet extracted from an Excel file.

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:728](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L728)

Name of the worksheet (tab name in Excel)

---

### rows

> **rows**: (`string` \| `number` \| `boolean` \| `null`)[][]

Defined in: [types/processor.ts:730](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L730)

Row data as a 2D array. Each inner array represents a row.

---

### headers

> **headers**: `string`[]

Defined in: [types/processor.ts:732](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L732)

Headers extracted from the first row

---

### rowCount

> **rowCount**: `number`

Defined in: [types/processor.ts:734](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L734)

Number of rows extracted (may be less than actual if truncated)

---

### columnCount

> **columnCount**: `number`

Defined in: [types/processor.ts:736](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L736)

Number of columns (based on headers or first row)
