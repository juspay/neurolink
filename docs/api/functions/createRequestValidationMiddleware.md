[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestValidationMiddleware

# Function: createRequestValidationMiddleware()

> **createRequestValidationMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/validation.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/validation.ts#L38)

Create request validation middleware

## Parameters

### config

[`ValidationConfig`](../type-aliases/ValidationConfig.md)

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
const validationMiddleware = createRequestValidationMiddleware({
  bodySchema: {
    required: ["input"],
    properties: {
      input: { type: "string", minimum: 1 },
      temperature: { type: "number", minimum: 0, maximum: 1 },
    },
  },
});

server.registerMiddleware(validationMiddleware);
```
