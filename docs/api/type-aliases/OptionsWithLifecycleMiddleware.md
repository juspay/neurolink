[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OptionsWithLifecycleMiddleware

# Type Alias: OptionsWithLifecycleMiddleware

> **OptionsWithLifecycleMiddleware** = `object`

Defined in: [types/middleware.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L387)

Structural view of the nested lifecycle config buried inside a request's
middleware blob. Extracted so call sites that need to read it (e.g.
`BaseProvider.wrapStreamWithLifecycleCallbacks`,
`BaseProvider.fireLifecycleErrorCallback`) don't each inline the same
three-level cast.

## Properties

### middleware?

> `optional` **middleware?**: `object`

Defined in: [types/middleware.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L388)

#### middlewareConfig?

> `optional` **middlewareConfig?**: `object`

##### middlewareConfig.lifecycle?

> `optional` **lifecycle?**: `object`

##### middlewareConfig.lifecycle.config?

> `optional` **config?**: [`LifecycleMiddlewareConfig`](LifecycleMiddlewareConfig.md)
