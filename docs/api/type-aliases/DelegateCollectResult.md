[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateCollectResult

# Type Alias: DelegateCollectResult

> **DelegateCollectResult** = `object`

Outcomes claimed by one collect call, in COMPLETION order — the order
workers finished in, which has nothing to do with the order they were
spawned in.

## Properties

### completed

> **completed**: [`DelegateOutcome`](DelegateOutcome.md)[]

Claimed exactly once: these outcomes are gone from the registry.

---

### pending

> **pending**: `number`

Still running or waiting for a pool slot.

---

### ready

> **ready**: `number`

Finished but not yet claimed.

---

### timedOut

> **timedOut**: `boolean`

True when the wait expired before this call claimed what it asked for:
for a named worker, that worker's outcome; for `any`, any outcome while
work was still pending; for `all`, pending work remained when the wait
ran out. A collect that claimed something reports `false` even if other
work is still outstanding — `pending`/`ready` carry that.
