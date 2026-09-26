[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:3181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3181)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:3182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3182)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:3183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3183)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:3184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3184)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:3185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3185)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:3186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3186)
