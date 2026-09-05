[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:2789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2789)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2791)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2792)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:2797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2797)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:2798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2798)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:2800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2800)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:2801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2801)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:2802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2802)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:2804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2804)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:2805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2805)
