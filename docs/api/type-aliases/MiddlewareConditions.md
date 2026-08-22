[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConditions

# Type Alias: MiddlewareConditions

> **MiddlewareConditions** = `object`

Defined in: [types/middleware.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L82)

Conditions for applying middleware

## Properties

### providers?

> `optional` **providers?**: `string`[]

Defined in: [types/middleware.ts:84](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L84)

Apply only to specific providers

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/middleware.ts:86](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L86)

Apply only to specific models

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:88](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L88)

Apply only when certain options are present

---

### custom?

> `optional` **custom?**: (`context`) => `boolean`

Defined in: [types/middleware.ts:90](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L90)

Custom condition function

#### Parameters

##### context

[`MiddlewareContext`](MiddlewareContext.md)

#### Returns

`boolean`
