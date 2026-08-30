[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:2743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2743)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2744)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2746)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:2751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2751)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:2752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2752)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:2753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2753)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:2754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2754)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:2756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2756)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:2757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2757)
