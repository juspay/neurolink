[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2800)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2801)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2802)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2803)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2804)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2805)
