[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthValidatorFromProvider

# Function: createAuthValidatorFromProvider()

> **createAuthValidatorFromProvider**(`provider`): (`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>

Defined in: [auth/serverBridge.ts:12](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/serverBridge.ts#L12)

Create a validate function for server auth middleware from an auth provider.

## Parameters

### provider

[`AuthProvider`](../type-aliases/AuthProvider.md)

## Returns

(`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>
