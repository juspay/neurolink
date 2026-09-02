[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Defined in: [types/proxy.ts:2500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2500)

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/proxy.ts:2501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2501)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/proxy.ts:2502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2502)

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

Defined in: [types/proxy.ts:2503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2503)

---

### statusCode

> **statusCode**: `number` \| `null`

Defined in: [types/proxy.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2504)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2505)
