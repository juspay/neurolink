[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRequestHandler

# Type Alias: AuthRequestHandler

> **AuthRequestHandler** = `object`

Defined in: [types/auth.ts:1139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1139)

Request-level authentication.

## Methods

### authenticateRequest()

> **authenticateRequest**(`context`): `Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>

Defined in: [types/auth.ts:1141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1141)

Authenticate a request and return full context

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>
