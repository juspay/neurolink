[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureAdmission

# Type Alias: ProxyBodyCaptureAdmission

> **ProxyBodyCaptureAdmission** = `object`

Exact bounded-admission state; records no request content.

## Properties

### limitingResource

> **limitingResource**: `"entry"` \| `"captures"` \| `"bytes"` \| `"worker"`

---

### estimatedBytes?

> `optional` **estimatedBytes?**: `number`

---

### maxEntryBytes?

> `optional` **maxEntryBytes?**: `number`

Per-entry clone ceiling, independent of the aggregate queue ceiling.

---

### pending

> **pending**: `number`

---

### pendingBytes

> **pendingBytes**: `number`

---

### maxPending

> **maxPending**: `number`

---

### maxPendingBytes

> **maxPendingBytes**: `number`
