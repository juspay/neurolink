[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorHandlingMiddleware

# Function: createErrorHandlingMiddleware()

> **createErrorHandlingMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:148](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/common.ts#L148)

Create error handling middleware
Catches errors and formats them consistently

## Parameters

### options?

#### includeStack?

`boolean`

Include stack trace in error response

#### onError?

(`error`, `ctx`) => `unknown`

Custom error handler

#### logErrors?

`boolean`

Log errors

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(
  createErrorHandlingMiddleware({
    includeStack: process.env.NODE_ENV === "development",
  }),
);
```
