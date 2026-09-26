[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeActivity

# Type Alias: ProxyRuntimeActivity

> **ProxyRuntimeActivity** = `object`

Defined in: [types/proxy.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2340)

Activity payload exposed by the running proxy status endpoint.

## Properties

### activeRequests

> **activeRequests**: `number`

Defined in: [types/proxy.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2341)

---

### lastActivityAt

> **lastActivityAt**: `string` \| `null`

Defined in: [types/proxy.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2342)

---

### drainingWorkers?

> `optional` **drainingWorkers?**: `number`

Defined in: [types/proxy.ts:2344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2344)

Supervisor-wide resources that must settle before process replacement.

---

### queuedSockets?

> `optional` **queuedSockets?**: `number`

Defined in: [types/proxy.ts:2345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2345)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2346)

---

### candidateWorkers?

> `optional` **candidateWorkers?**: `number`

Defined in: [types/proxy.ts:2347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2347)
