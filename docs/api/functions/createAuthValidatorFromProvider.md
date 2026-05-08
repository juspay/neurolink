[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthValidatorFromProvider

# Function: createAuthValidatorFromProvider()

> **createAuthValidatorFromProvider**(`provider`): (`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>

Defined in: [auth/serverBridge.ts:12](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/serverBridge.ts#L12)

Create a validate function for server auth middleware from an auth provider.

## Parameters

### provider

[`AuthProvider`](../type-aliases/AuthProvider.md)

## Returns

(`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>
