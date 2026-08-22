[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExcelJSWorkbook

# Type Alias: ExcelJSWorkbook

> **ExcelJSWorkbook** = `object`

Defined in: [types/processor.ts:715](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L715)

## Properties

### worksheets

> **worksheets**: [`ExcelJSWorksheet`](ExcelJSWorksheet.md)[]

Defined in: [types/processor.ts:716](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L716)

---

### getWorksheet

> **getWorksheet**: (`name`) => [`ExcelJSWorksheet`](ExcelJSWorksheet.md) \| `undefined`

Defined in: [types/processor.ts:717](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L717)

#### Parameters

##### name

`string`

#### Returns

[`ExcelJSWorksheet`](ExcelJSWorksheet.md) \| `undefined`

---

### xlsx

> **xlsx**: `object`

Defined in: [types/processor.ts:718](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L718)

#### load

> **load**: (`buffer`) => `Promise`\<`void`\>

##### Parameters

###### buffer

`ArrayBuffer`

##### Returns

`Promise`\<`void`\>
