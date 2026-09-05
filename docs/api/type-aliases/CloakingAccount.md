[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Defined in: [types/proxy.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L340)

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L341)

---

### type

> **type**: `"api_key"` \| `"oauth"`

Defined in: [types/proxy.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L342)

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

Defined in: [types/proxy.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L343)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/proxy.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L344)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/proxy.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L345)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/proxy.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L346)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/proxy.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L347)
