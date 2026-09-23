[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeActivity

# Type Alias: ProxyRuntimeActivity

> **ProxyRuntimeActivity** = `object`

Defined in: [types/proxy.ts:2219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2219)

Activity payload exposed by the running proxy status endpoint.

## Properties

### activeRequests

> **activeRequests**: `number`

Defined in: [types/proxy.ts:2220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2220)

---

### lastActivityAt

> **lastActivityAt**: `string` \| `null`

Defined in: [types/proxy.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2221)

---

### drainingWorkers?

> `optional` **drainingWorkers?**: `number`

Defined in: [types/proxy.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2223)

Supervisor-wide resources that must settle before process replacement.

---

### queuedSockets?

> `optional` **queuedSockets?**: `number`

Defined in: [types/proxy.ts:2224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2224)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2225)

---

### candidateWorkers?

> `optional` **candidateWorkers?**: `number`

Defined in: [types/proxy.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2226)
