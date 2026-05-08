[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConditions

# Type Alias: MiddlewareConditions

> **MiddlewareConditions** = `object`

Defined in: [types/middleware.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L52)

Conditions for applying middleware

## Properties

### providers?

> `optional` **providers?**: `string`[]

Defined in: [types/middleware.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L54)

Apply only to specific providers

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/middleware.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L56)

Apply only to specific models

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L58)

Apply only when certain options are present

---

### custom?

> `optional` **custom?**: (`context`) => `boolean`

Defined in: [types/middleware.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L60)

Custom condition function

#### Parameters

##### context

[`MiddlewareContext`](MiddlewareContext.md)

#### Returns

`boolean`
