[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthProbe

# Type Alias: ProxyHealthProbe

> **ProxyHealthProbe** = `object`

Result of one local proxy health probe by the updater or fail-open guard.

## Properties

### healthy

> **healthy**: `boolean`

---

### durationMs

> **durationMs**: `number`

---

### failure

> **failure**: `"http_status"` \| `"network"` \| `"timeout"` \| `null`

---

### statusCode

> **statusCode**: `number` \| `null`

---

### errorCode

> **errorCode**: `string` \| `null`
