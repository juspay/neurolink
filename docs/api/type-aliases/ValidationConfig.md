[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidationConfig

# Type Alias: ValidationConfig

> **ValidationConfig** = `object`

Defined in: [types/middleware.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L484)

Validation configuration for the request-validation middleware.

## Properties

### bodySchema?

> `optional` **bodySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L485)

---

### querySchema?

> `optional` **querySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:486](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L486)

---

### paramsSchema?

> `optional` **paramsSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L487)

---

### headersSchema?

> `optional` **headersSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

Defined in: [types/middleware.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L488)

---

### customValidator?

> `optional` **customValidator?**: (`ctx`) => `Promise`\<`void`\>

Defined in: [types/middleware.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L489)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`Promise`\<`void`\>

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L490)

---

### errorFormatter?

> `optional` **errorFormatter?**: (`errors`) => `unknown`

Defined in: [types/middleware.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L491)

#### Parameters

##### errors

[`ValidationErrorInfo`](ValidationErrorInfo.md)[]

#### Returns

`unknown`
