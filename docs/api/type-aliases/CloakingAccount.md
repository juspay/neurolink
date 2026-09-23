[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Defined in: [types/proxy.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L352)

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L353)

---

### type

> **type**: `"api_key"` \| `"oauth"`

Defined in: [types/proxy.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L354)

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

Defined in: [types/proxy.ts:355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L355)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/proxy.ts:356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L356)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/proxy.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L357)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/proxy.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L358)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/proxy.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L359)
