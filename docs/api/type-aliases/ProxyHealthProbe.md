[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2512)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2513)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2514)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2515)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2516)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2517)
