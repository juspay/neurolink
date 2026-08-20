[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2402)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2403)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2404)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2405)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2406)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2407)
