[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderHealthStatus

# Type Alias: AuthProviderHealthStatus

> **AuthProviderHealthStatus** = `object`

Defined in: [types/auth.ts:1056](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1056)

Auth-domain provider health status returned by AuthProviderRegistry.

Not to be confused with the AI-provider `ProviderHealthStatus` union in
`providers.ts`; this type tracks auth-provider connectivity.

## Properties

### type

> **type**: [`AuthProviderType`](AuthProviderType.md)

Defined in: [types/auth.ts:1057](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1057)

---

### healthy

> **healthy**: `boolean`

Defined in: [types/auth.ts:1058](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1058)

---

### lastCheck

> **lastCheck**: `Date`

Defined in: [types/auth.ts:1059](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1059)

---

### latency?

> `optional` **latency?**: `number`

Defined in: [types/auth.ts:1060](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1060)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/auth.ts:1061](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1061)
