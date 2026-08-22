[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRequestHandler

# Type Alias: AuthRequestHandler

> **AuthRequestHandler** = `object`

Defined in: [types/auth.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1139)

Request-level authentication.

## Methods

### authenticateRequest()

> **authenticateRequest**(`context`): `Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>

Defined in: [types/auth.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1141)

Authenticate a request and return full context

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>
