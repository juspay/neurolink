[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRequestHandler

# Type Alias: AuthRequestHandler

> **AuthRequestHandler** = `object`

Request-level authentication.

## Methods

### authenticateRequest()

> **authenticateRequest**(`context`): `Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>

Authenticate a request and return full context

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>
