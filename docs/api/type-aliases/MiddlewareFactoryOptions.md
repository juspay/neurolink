[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactoryOptions

# Type Alias: MiddlewareFactoryOptions

> **MiddlewareFactoryOptions** = `object`

Defined in: [types/middlewareTypes.ts:147](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L147)

Factory options for middleware

## Properties

### middleware?

> `optional` **middleware**: [`NeuroLinkMiddleware`](NeuroLinkMiddleware.md)[]

Defined in: [types/middlewareTypes.ts:149](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L149)

Custom middleware to register on initialization

---

### enabledMiddleware?

> `optional` **enabledMiddleware**: `string`[]

Defined in: [types/middlewareTypes.ts:151](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L151)

Enable specific middleware

---

### disabledMiddleware?

> `optional` **disabledMiddleware**: `string`[]

Defined in: [types/middlewareTypes.ts:153](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L153)

Disable specific middleware

---

### middlewareConfig?

> `optional` **middlewareConfig**: `Record`\<`string`, [`MiddlewareConfig`](MiddlewareConfig.md)\>

Defined in: [types/middlewareTypes.ts:155](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L155)

Middleware configurations

---

### preset?

> `optional` **preset**: `string`

Defined in: [types/middlewareTypes.ts:157](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L157)

Use a preset configuration

---

### global?

> `optional` **global**: `object`

Defined in: [types/middlewareTypes.ts:159](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/middlewareTypes.ts#L159)

Global middleware settings

#### maxExecutionTime?

> `optional` **maxExecutionTime**: `number`

Maximum execution time for middleware chain

#### continueOnError?

> `optional` **continueOnError**: `boolean`

Whether to continue on middleware errors

#### collectStats?

> `optional` **collectStats**: `boolean`

Whether to collect execution statistics
