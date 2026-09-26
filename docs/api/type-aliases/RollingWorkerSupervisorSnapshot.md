[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:3437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3437)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3438)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3439)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:3440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3440)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:3445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3445)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:3446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3446)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/proxy.ts:3448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3448)

Offered sockets awaiting acknowledgement or commit, across all workers.

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:3449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3449)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:3450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3450)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:3452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3452)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:3453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3453)
