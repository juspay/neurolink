[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:3370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3370)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3371)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3372)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3373)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:3378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3378)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:3379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3379)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:3381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3381)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:3382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3382)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:3383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3383)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:3385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3385)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:3386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3386)
