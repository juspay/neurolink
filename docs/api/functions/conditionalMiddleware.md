[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / conditionalMiddleware

# Function: conditionalMiddleware()

> **conditionalMiddleware**(`condition`, `middleware`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:793](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L793)

Conditionally apply middleware

## Parameters

### condition

(`request`) => `boolean`

### middleware

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  conditionalMiddleware(
    (request) => request.url.includes("/api/agents"),
    createLoggingInterceptor(),
  ),
);
```
