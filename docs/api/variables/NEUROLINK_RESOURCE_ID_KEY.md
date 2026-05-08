[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NEUROLINK_RESOURCE_ID_KEY

# Variable: NEUROLINK_RESOURCE_ID_KEY

> `const` **NEUROLINK_RESOURCE_ID_KEY**: `"neurolink__resourceId"` = `"neurolink__resourceId"`

Defined in: [auth/RequestContext.ts:8](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L8)

Type-safe Map wrapper for request-scoped context.
Flows from auth middleware through generate/stream/tools/memory.
Reserved keys (prefixed neurolink\_\_) cannot be overridden by client code.
