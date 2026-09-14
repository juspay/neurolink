[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:3091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3091)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3092)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3093)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3094)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:3099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3099)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:3100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3100)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:3102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3102)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:3103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3103)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:3104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3104)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:3106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3106)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:3107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3107)
