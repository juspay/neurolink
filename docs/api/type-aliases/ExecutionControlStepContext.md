[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionControlStepContext

# Type Alias: ExecutionControlStepContext

> **ExecutionControlStepContext** = `object`

Defined in: [types/stream.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L244)

What a `beforeStep` callback is told at a step boundary.

The boundary is reached only after that step's tool results have settled and
been written into the conversation, and before the step cap is re-checked —
so a decision taken here applies to the NEXT step of the SAME turn, never to
a step already in flight.

## Properties

### stepIndex

> **stepIndex**: `number`

Defined in: [types/stream.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L246)

Zero-based index of the step that just settled.

---

### stepsCompleted

> **stepsCompleted**: `number`

Defined in: [types/stream.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L248)

Steps that have completed in this turn, including the one that just settled.

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/stream.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L250)

The step cap currently in force — the number a renewal must exceed.

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/stream.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L252)

Milliseconds since the turn's first request was built.

---

### toolNames

> **toolNames**: `string`[]

Defined in: [types/stream.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L254)

Names of the tools dispatched on the step that just settled, in order.

---

### signal

> **signal**: `AbortSignal`

Defined in: [types/stream.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L260)

Fires when the turn is cancelled or the callback outlives its own budget.
A callback that does real work (reading a live budget, asking a service)
must honour it — the turn does not wait for a callback that ignores it.
