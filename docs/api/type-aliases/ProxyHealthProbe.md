[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2469)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2470)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2471)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2472)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2473)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2474)
