[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthValidatorFromProvider

# Function: createAuthValidatorFromProvider()

> **createAuthValidatorFromProvider**(`provider`): (`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>

Defined in: [auth/serverBridge.ts:12](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/serverBridge.ts#L12)

Create a validate function for server auth middleware from an auth provider.

## Parameters

### provider

[`AuthProvider`](../type-aliases/AuthProvider.md)

## Returns

(`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>
