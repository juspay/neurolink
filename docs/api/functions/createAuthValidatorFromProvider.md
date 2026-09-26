[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthValidatorFromProvider

# Function: createAuthValidatorFromProvider()

> **createAuthValidatorFromProvider**(`provider`): (`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>

Create a validate function for server auth middleware from an auth provider.

## Parameters

### provider

[`AuthProvider`](../type-aliases/AuthProvider.md)

## Returns

(`token`, `ctx`) => `Promise`\<\{ `id`: `string`; `email?`: `string`; `roles?`: `string`[]; \} \| `null`\>
