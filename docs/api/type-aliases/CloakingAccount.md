[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Defined in: [types/proxy.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L334)

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L335)

---

### type

> **type**: `"api_key"` \| `"oauth"`

Defined in: [types/proxy.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L336)

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

Defined in: [types/proxy.ts:337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L337)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/proxy.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L338)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/proxy.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L339)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/proxy.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L340)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/proxy.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L341)
