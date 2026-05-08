[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExcelJSWorksheet

# Type Alias: ExcelJSWorksheet

> **ExcelJSWorksheet** = `object`

Defined in: [types/processor.ts:702](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L702)

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:703](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L703)

---

### rowCount

> **rowCount**: `number`

Defined in: [types/processor.ts:704](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L704)

---

### eachRow

> **eachRow**: \{(`callback`): `void`; (`opts`, `callback`): `void`; \}

Defined in: [types/processor.ts:705](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L705)

#### Call Signature

> (`callback`): `void`

##### Parameters

###### callback

(`row`, `rowNumber`) => `void`

##### Returns

`void`

#### Call Signature

> (`opts`, `callback`): `void`

##### Parameters

###### opts

###### includeEmpty

`boolean`

###### callback

(`row`, `rowNumber`) => `void`

##### Returns

`void`

---

### getRow

> **getRow**: (`rowNumber`) => [`ExcelJSRow`](ExcelJSRow.md)

Defined in: [types/processor.ts:712](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L712)

#### Parameters

##### rowNumber

`number`

#### Returns

[`ExcelJSRow`](ExcelJSRow.md)
