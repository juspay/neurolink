[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerNodeMiddleware

# Type Alias: ServerNodeMiddleware

> **ServerNodeMiddleware** = (`req`, `res`, `next`) => `void`

A body-parser middleware (`express.json()`, `express.urlencoded()`) as
body-parser types it: Node's request and response, and a `next` that takes
an error. Typed without Express, which is an optional peer, so the published
declarations do not import it.

## Parameters

### req

[`ServerParsedNodeRequest`](ServerParsedNodeRequest.md)

### res

`NodeServerResponse`

### next

(`error?`) => `void`

## Returns

`void`
