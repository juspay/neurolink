[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeActivity

# Type Alias: ProxyRuntimeActivity

> **ProxyRuntimeActivity** = `object`

Defined in: [types/proxy.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2239)

Activity payload exposed by the running proxy status endpoint.

## Properties

### activeRequests

> **activeRequests**: `number`

Defined in: [types/proxy.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2240)

---

### lastActivityAt

> **lastActivityAt**: `string` \| `null`

Defined in: [types/proxy.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2241)

---

### drainingWorkers?

> `optional` **drainingWorkers?**: `number`

Defined in: [types/proxy.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2243)

Supervisor-wide resources that must settle before process replacement.

---

### queuedSockets?

> `optional` **queuedSockets?**: `number`

Defined in: [types/proxy.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2244)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:2245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2245)

---

### candidateWorkers?

> `optional` **candidateWorkers?**: `number`

Defined in: [types/proxy.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2246)
