[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidationConfig

# Type Alias: ValidationConfig

> **ValidationConfig** = `object`

Defined in: [types/middleware.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L478)

Validation configuration for the request-validation middleware.

## Properties

### bodySchema?

> `optional` **bodySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L479)

---

### querySchema?

> `optional` **querySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L480)

---

### paramsSchema?

> `optional` **paramsSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L481)

---

### headersSchema?

> `optional` **headersSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L482)

---

### customValidator?

> `optional` **customValidator?**: (`ctx`) => `Promise`\<`void`\>

Defined in: [types/middleware.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L483)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`Promise`\<`void`\>

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L484)

---

### errorFormatter?

> `optional` **errorFormatter?**: (`errors`) => `unknown`

Defined in: [types/middleware.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L485)

#### Parameters

##### errors

[`ValidationErrorInfo`](ValidationErrorInfo.md)[]

#### Returns

`unknown`
