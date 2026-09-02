[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2491)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2492)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2493)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2494)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2495)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2496)
