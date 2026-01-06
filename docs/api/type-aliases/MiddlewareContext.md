[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareContext

# Type Alias: MiddlewareContext

> **MiddlewareContext** = `object`

Defined in: [types/middlewareTypes.ts:63](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L63)

Context passed to middleware for decision making

## Properties

### provider

> **provider**: `string`

Defined in: [types/middlewareTypes.ts:65](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L65)

Provider name

---

### model

> **model**: `string`

Defined in: [types/middlewareTypes.ts:67](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L67)

Model name

---

### options

> **options**: `Record`\<`string`, `unknown`\>

Defined in: [types/middlewareTypes.ts:69](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L69)

Request options

---

### session?

> `optional` **session**: `object`

Defined in: [types/middlewareTypes.ts:71](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L71)

Session information

#### sessionId?

> `optional` **sessionId**: `string`

#### userId?

> `optional` **userId**: `string`

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `JsonValue`\>

Defined in: [types/middlewareTypes.ts:76](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L76)

Additional metadata
