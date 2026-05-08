[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingAccount

# Type Alias: CloakingAccount

> **CloakingAccount** = `object`

Defined in: [types/proxy.ts:322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L322)

Minimal account shape needed by the cloaking pipeline.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L323)

---

### type

> **type**: `"api_key"` \| `"oauth"`

Defined in: [types/proxy.ts:324](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L324)

---

### status

> **status**: `"healthy"` \| `"quota_exceeded"` \| `"error"`

Defined in: [types/proxy.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L325)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/proxy.ts:326](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L326)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/proxy.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L327)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/proxy.ts:328](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L328)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/proxy.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L329)
