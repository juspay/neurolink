[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConditions

# Type Alias: MiddlewareConditions

> **MiddlewareConditions** = `object`

Defined in: [types/middleware.ts:76](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L76)

Conditions for applying middleware

## Properties

### providers?

> `optional` **providers?**: `string`[]

Defined in: [types/middleware.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L78)

Apply only to specific providers

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/middleware.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L80)

Apply only to specific models

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L82)

Apply only when certain options are present

---

### custom?

> `optional` **custom?**: (`context`) => `boolean`

Defined in: [types/middleware.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L84)

Custom condition function

#### Parameters

##### context

[`MiddlewareContext`](MiddlewareContext.md)

#### Returns

`boolean`
