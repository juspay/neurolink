[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactoryOptions

# Type Alias: MiddlewareFactoryOptions

> **MiddlewareFactoryOptions** = `object`

Defined in: [types/middleware.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L151)

Factory options for middleware

## Properties

### middleware?

> `optional` **middleware?**: [`NeuroLinkMiddleware`](NeuroLinkMiddleware.md)[]

Defined in: [types/middleware.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L153)

Custom middleware to register on initialization

---

### enabledMiddleware?

> `optional` **enabledMiddleware?**: `string`[]

Defined in: [types/middleware.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L155)

Enable specific middleware

---

### disabledMiddleware?

> `optional` **disabledMiddleware?**: `string`[]

Defined in: [types/middleware.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L157)

Disable specific middleware

---

### middlewareConfig?

> `optional` **middlewareConfig?**: `Record`\<`string`, [`MiddlewareConfig`](MiddlewareConfig.md)\>

Defined in: [types/middleware.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L159)

Middleware configurations

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/middleware.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L161)

Use a preset configuration

---

### global?

> `optional` **global?**: `object`

Defined in: [types/middleware.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L163)

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
