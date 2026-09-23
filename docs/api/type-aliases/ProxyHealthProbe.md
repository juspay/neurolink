[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:3031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3031)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:3032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3032)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:3033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3033)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:3034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3034)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:3035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3035)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:3036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3036)
