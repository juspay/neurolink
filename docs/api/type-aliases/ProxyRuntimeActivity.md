[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeActivity

# Type Alias: ProxyRuntimeActivity

> **ProxyRuntimeActivity** = `object`

Defined in: [types/proxy.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2309)

Activity payload exposed by the running proxy status endpoint.

## Properties

### activeRequests

> **activeRequests**: `number`

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)

---

### lastActivityAt

> **lastActivityAt**: `string` \| `null`

Defined in: [types/proxy.ts:2311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2311)

---

### drainingWorkers?

> `optional` **drainingWorkers?**: `number`

Defined in: [types/proxy.ts:2313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2313)

Supervisor-wide resources that must settle before process replacement.

---

### queuedSockets?

> `optional` **queuedSockets?**: `number`

Defined in: [types/proxy.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2314)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:2315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2315)

---

### candidateWorkers?

> `optional` **candidateWorkers?**: `number`

Defined in: [types/proxy.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2316)
