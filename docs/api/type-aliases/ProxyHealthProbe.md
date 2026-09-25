[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:3119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3119)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:3120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3120)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:3121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3121)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:3122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3122)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:3123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3123)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:3124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3124)
