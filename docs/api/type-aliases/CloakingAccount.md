[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Defined in: [types/proxy.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L346)

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L347)

---

### type

> **type**: `"api_key"` \| `"oauth"`

Defined in: [types/proxy.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L348)

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

Defined in: [types/proxy.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L349)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/proxy.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L350)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/proxy.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L351)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/proxy.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L352)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/proxy.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L353)
