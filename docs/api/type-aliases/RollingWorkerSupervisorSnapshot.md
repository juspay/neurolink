[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:3435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3435)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3436)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3437)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3438)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:3443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3443)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:3444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3444)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:3446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3446)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:3447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3447)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:3448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3448)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:3450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3450)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:3451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3451)
