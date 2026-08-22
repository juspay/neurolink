[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestValidationMiddleware

# Function: createRequestValidationMiddleware()

> **createRequestValidationMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/validation.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/server/middleware/validation.ts#L38)

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
