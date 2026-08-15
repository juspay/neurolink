[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRequestHandler

# Type Alias: AuthRequestHandler

> **AuthRequestHandler** = `object`

Defined in: [types/auth.ts:1139](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L1139)

Request-level authentication.

## Methods

### authenticateRequest()

> **authenticateRequest**(`context`): `Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>

Defined in: [types/auth.ts:1141](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L1141)

Authenticate a request and return full context

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthenticatedContext`](AuthenticatedContext.md) \| `null`\>
