[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NEUROLINK_RESOURCE_ID_KEY

# Variable: NEUROLINK_RESOURCE_ID_KEY

> `const` **NEUROLINK_RESOURCE_ID_KEY**: `"neurolink__resourceId"` = `"neurolink__resourceId"`

Defined in: [auth/RequestContext.ts:8](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/RequestContext.ts#L8)

Type-safe Map wrapper for request-scoped context.
Flows from auth middleware through generate/stream/tools/memory.
Reserved keys (prefixed neurolink\_\_) cannot be overridden by client code.
