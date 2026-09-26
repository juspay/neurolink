[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactoryOptions

# Type Alias: MiddlewareFactoryOptions

> **MiddlewareFactoryOptions** = `object`

Factory options for middleware

## Properties

### middleware?

> `optional` **middleware?**: [`NeuroLinkMiddleware`](NeuroLinkMiddleware.md)[]

Custom middleware to register on initialization

---

### enabledMiddleware?

> `optional` **enabledMiddleware?**: `string`[]

Enable specific middleware

---

### disabledMiddleware?

> `optional` **disabledMiddleware?**: `string`[]

Disable specific middleware

---

### middlewareConfig?

> `optional` **middlewareConfig?**: `Record`\<`string`, [`MiddlewareConfig`](MiddlewareConfig.md)\>

Middleware configurations

---

### preset?

> `optional` **preset?**: `string`

Use a preset configuration

---

### global?

> `optional` **global?**: `object`

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
