[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:2765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2765)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2766)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2768)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:2773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2773)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:2774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2774)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:2775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2775)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:2776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2776)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:2778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2778)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:2779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2779)
