[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareContext

# Type Alias: MiddlewareContext

> **MiddlewareContext** = `object`

Defined in: [types/middleware.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L66)

Context passed to middleware for decision making

## Properties

### provider

> **provider**: `string`

Defined in: [types/middleware.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L68)

Provider name

---

### model

> **model**: `string`

Defined in: [types/middleware.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L70)

Model name

---

### options

> **options**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L72)

Request options

---

### session?

> `optional` **session?**: `object`

Defined in: [types/middleware.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L74)

Session information

#### sessionId?

> `optional` **sessionId?**: `string`

#### userId?

> `optional` **userId?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L79)

Additional metadata
