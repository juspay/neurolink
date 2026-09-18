[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2839)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2840)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2841)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2842)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2843)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2844)
