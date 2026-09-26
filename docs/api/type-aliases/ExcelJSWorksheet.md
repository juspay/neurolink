[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExcelJSWorksheet

# Type Alias: ExcelJSWorksheet

> **ExcelJSWorksheet** = `object`

## Properties

### name

> **name**: `string`

---

### rowCount

> **rowCount**: `number`

---

### eachRow

> **eachRow**: \{(`callback`): `void`; (`opts`, `callback`): `void`; \}

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

#### Parameters

##### rowNumber

`number`

#### Returns

[`ExcelJSRow`](ExcelJSRow.md)
