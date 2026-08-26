[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateCollectResult

# Type Alias: DelegateCollectResult

> **DelegateCollectResult** = `object`

Defined in: [types/delegation.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L110)

Outcomes claimed by one collect call, in COMPLETION order — the order
workers finished in, which has nothing to do with the order they were
spawned in.

## Properties

### completed

> **completed**: [`DelegateOutcome`](DelegateOutcome.md)[]

Defined in: [types/delegation.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L112)

Claimed exactly once: these outcomes are gone from the registry.

---

### pending

> **pending**: `number`

Defined in: [types/delegation.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L114)

Still running or waiting for a pool slot.

---

### ready

> **ready**: `number`

Defined in: [types/delegation.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L116)

Finished but not yet claimed.

---

### timedOut

> **timedOut**: `boolean`

Defined in: [types/delegation.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L124)

True when the wait expired before this call claimed what it asked for:
for a named worker, that worker's outcome; for `any`, any outcome while
work was still pending; for `all`, pending work remained when the wait
ran out. A collect that claimed something reports `false` even if other
work is still outstanding — `pending`/`ready` carry that.
