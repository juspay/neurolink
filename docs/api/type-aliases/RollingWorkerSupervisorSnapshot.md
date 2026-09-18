[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:3130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3130)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3131)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3132)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3133)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:3138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3138)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:3139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3139)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:3141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3141)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:3142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3142)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:3143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3143)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:3145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3145)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:3146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3146)
