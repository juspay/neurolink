[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTimingMiddleware

# Function: createTimingMiddleware()

> **createTimingMiddleware**(): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/server/middleware/common.ts#L26)

Create request timing middleware
Adds timing information to responses

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(createTimingMiddleware());
```
