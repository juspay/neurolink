[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestValidationMiddleware

# Function: createRequestValidationMiddleware()

> **createRequestValidationMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/validation.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/validation.ts#L38)

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
