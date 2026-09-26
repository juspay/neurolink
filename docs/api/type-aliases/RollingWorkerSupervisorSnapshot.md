[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

## Properties

### generation

> **generation**: `number`

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

---

### draining

> **draining**: `object`[]

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

---

### failedTransfers

> **failedTransfers**: `number`

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`
