[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidationConfig

# Type Alias: ValidationConfig

> **ValidationConfig** = `object`

Defined in: [types/middleware.ts:426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L426)

Validation configuration for the request-validation middleware.

## Properties

### bodySchema?

> `optional` **bodySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:427](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L427)

---

### querySchema?

> `optional` **querySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L428)

---

### paramsSchema?

> `optional` **paramsSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:429](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L429)

---

### headersSchema?

> `optional` **headersSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L430)

---

### customValidator?

> `optional` **customValidator?**: (`ctx`) => `Promise`\<`void`\>

Defined in: [types/middleware.ts:431](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L431)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`Promise`\<`void`\>

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L432)

---

### errorFormatter?

> `optional` **errorFormatter?**: (`errors`) => `unknown`

Defined in: [types/middleware.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L433)

#### Parameters

##### errors

[`ValidationErrorInfo`](ValidationErrorInfo.md)[]

#### Returns

`unknown`
