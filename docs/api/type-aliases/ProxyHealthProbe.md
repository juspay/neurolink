[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2392)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2393)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2395)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2396)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)
