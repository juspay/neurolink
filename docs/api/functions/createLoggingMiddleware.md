[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createLoggingMiddleware

# Function: createLoggingMiddleware()

> **createLoggingMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Create request logging middleware
Logs request and response information

## Parameters

### options?

#### logBody?

`boolean`

Log request body

#### logResponse?

`boolean`

Log response body

#### logger?

\{ `info`: (`message`, `data?`) => `void`; `error`: (`message`, `data?`) => `void`; \}

Custom logger

#### logger.info

(`message`, `data?`) => `void`

#### logger.error

(`message`, `data?`) => `void`

#### skipPaths?

`string`[]

Skip logging for certain paths

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(
  createLoggingMiddleware({
    logBody: process.env.NODE_ENV === "development",
  }),
);
```
