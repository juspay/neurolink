[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2507)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2508)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2509)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2510)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2511)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2512)
