[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Defined in: [types/proxy.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L372)

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L373)

---

### type

> **type**: `"api_key"` \| `"oauth"`

Defined in: [types/proxy.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L374)

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

Defined in: [types/proxy.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L375)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/proxy.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L376)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/proxy.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L377)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/proxy.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L378)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/proxy.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L379)
