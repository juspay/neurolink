[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTimingMiddleware

# Function: createTimingMiddleware()

> **createTimingMiddleware**(): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Create request timing middleware
Adds timing information to responses

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(createTimingMiddleware());
```
