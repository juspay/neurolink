[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:3171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3171)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:3172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3172)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:3173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3173)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:3174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3174)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:3175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3175)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:3176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3176)
