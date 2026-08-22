[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:2666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2666)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2667)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2668)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2669)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:2674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2674)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:2675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2675)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2676)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:2677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2677)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:2679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2679)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2680)
