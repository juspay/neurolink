[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidationConfig

# Type Alias: ValidationConfig

> **ValidationConfig** = `object`

Validation configuration for the request-validation middleware.

## Properties

### bodySchema?

> `optional` **bodySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

---

### querySchema?

> `optional` **querySchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

---

### paramsSchema?

> `optional` **paramsSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

---

### headersSchema?

> `optional` **headersSchema?**: [`MiddlewareRequestSchema`](MiddlewareRequestSchema.md)

---

### customValidator?

> `optional` **customValidator?**: (`ctx`) => `Promise`\<`void`\>

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`Promise`\<`void`\>

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

---

### errorFormatter?

> `optional` **errorFormatter?**: (`errors`) => `unknown`

#### Parameters

##### errors

[`ValidationErrorInfo`](ValidationErrorInfo.md)[]

#### Returns

`unknown`
