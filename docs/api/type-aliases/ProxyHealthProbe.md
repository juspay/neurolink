[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2814)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2815)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2816)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2817)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2818)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2819)
