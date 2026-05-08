[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorHandlingMiddleware

# Function: createErrorHandlingMiddleware()

> **createErrorHandlingMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/common.ts#L148)

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
