[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestValidationMiddleware

# Function: createRequestValidationMiddleware()

> **createRequestValidationMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

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
