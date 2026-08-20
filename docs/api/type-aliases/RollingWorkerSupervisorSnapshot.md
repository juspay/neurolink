[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorSnapshot

# Type Alias: RollingWorkerSupervisorSnapshot

> **RollingWorkerSupervisorSnapshot** = `object`

Defined in: [types/proxy.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2676)

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2677)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2678)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/proxy.ts:2679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2679)

---

### draining

> **draining**: `object`[]

Defined in: [types/proxy.ts:2684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2684)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/proxy.ts:2685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2685)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/proxy.ts:2686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2686)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/proxy.ts:2687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2687)

---

### recentEvents

> **recentEvents**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)[]

Defined in: [types/proxy.ts:2689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2689)

Bounded generation-scoped evidence for attributing lifetime counters.

---

### lastFailure

> **lastFailure**: `object` & [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md) \| `null`

Defined in: [types/proxy.ts:2690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2690)
