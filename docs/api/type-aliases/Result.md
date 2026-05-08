[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Result

# Type Alias: Result\<T, E\>

> **Result**\<`T`, `E`\> = `object`

Defined in: [types/common.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L70)

Generic success/error result type

## Type Parameters

### T

`T` = `unknown`

### E

`E` = [`ErrorInfo`](ErrorInfo.md)

## Properties

### success

> **success**: `boolean`

Defined in: [types/common.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L71)

---

### data?

> `optional` **data?**: `T`

Defined in: [types/common.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L72)

---

### error?

> `optional` **error?**: `E`

Defined in: [types/common.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L73)
