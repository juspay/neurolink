[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:3051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3051)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:3052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3052)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:3053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3053)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:3054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3054)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:3055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3055)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:3056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3056)
