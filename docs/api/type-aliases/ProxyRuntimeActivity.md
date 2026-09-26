[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeActivity

# Type Alias: ProxyRuntimeActivity

> **ProxyRuntimeActivity** = `object`

Activity payload exposed by the running proxy status endpoint.

## Properties

### activeRequests

> **activeRequests**: `number`

---

### lastActivityAt

> **lastActivityAt**: `string` \| `null`

---

### drainingWorkers?

> `optional` **drainingWorkers?**: `number`

Supervisor-wide resources that must settle before process replacement.

---

### queuedSockets?

> `optional` **queuedSockets?**: `number`

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

---

### candidateWorkers?

> `optional` **candidateWorkers?**: `number`
