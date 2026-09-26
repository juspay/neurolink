[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:3497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3497)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3498)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3499)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3500)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:3505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3505)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:3506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3506)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:3508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3508)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:3509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3509)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:3510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3510)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:3512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3512)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:3513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3513)
