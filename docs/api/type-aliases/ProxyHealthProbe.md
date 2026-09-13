[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2691)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2692)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2693)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2694)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2695)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2696)
