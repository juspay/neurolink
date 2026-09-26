[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConditions

# Type Alias: MiddlewareConditions

> **MiddlewareConditions** = `object`

Conditions for applying middleware

## Properties

### providers?

> `optional` **providers?**: `string`[]

Apply only to specific providers

---

### models?

> `optional` **models?**: `string`[]

Apply only to specific models

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Apply only when certain options are present

---

### custom?

> `optional` **custom?**: (`context`) => `boolean`

Custom condition function

#### Parameters

##### context

[`MiddlewareContext`](MiddlewareContext.md)

#### Returns

`boolean`
