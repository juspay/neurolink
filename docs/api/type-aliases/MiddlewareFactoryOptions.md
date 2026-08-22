[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactoryOptions

# Type Alias: MiddlewareFactoryOptions

> **MiddlewareFactoryOptions** = `object`

Defined in: [types/middleware.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L181)

Factory options for middleware

## Properties

### middleware?

> `optional` **middleware?**: [`NeuroLinkMiddleware`](NeuroLinkMiddleware.md)[]

Defined in: [types/middleware.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L183)

Custom middleware to register on initialization

---

### enabledMiddleware?

> `optional` **enabledMiddleware?**: `string`[]

Defined in: [types/middleware.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L185)

Enable specific middleware

---

### disabledMiddleware?

> `optional` **disabledMiddleware?**: `string`[]

Defined in: [types/middleware.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L187)

Disable specific middleware

---

### middlewareConfig?

> `optional` **middlewareConfig?**: `Record`\<`string`, [`MiddlewareConfig`](MiddlewareConfig.md)\>

Defined in: [types/middleware.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L189)

Middleware configurations

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/middleware.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L191)

Use a preset configuration

---

### global?

> `optional` **global?**: `object`

Defined in: [types/middleware.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L193)

Global middleware settings

#### maxExecutionTime?

> `optional` **maxExecutionTime?**: `number`

Maximum execution time for middleware chain

#### continueOnError?

> `optional` **continueOnError?**: `boolean`

Whether to continue on middleware errors

#### collectStats?

> `optional` **collectStats?**: `boolean`

Whether to collect execution statistics
