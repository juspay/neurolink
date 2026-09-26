[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionControlStepContext

# Type Alias: ExecutionControlStepContext

> **ExecutionControlStepContext** = `object`

What a `beforeStep` callback is told at a step boundary.

The boundary is reached only after that step's tool results have settled and
been written into the conversation, and before the step cap is re-checked —
so a decision taken here applies to the NEXT step of the SAME turn, never to
a step already in flight.

## Properties

### stepIndex

> **stepIndex**: `number`

Zero-based index of the step that just settled.

---

### stepsCompleted

> **stepsCompleted**: `number`

Steps that have completed in this turn, including the one that just settled.

---

### maxSteps

> **maxSteps**: `number`

The step cap currently in force — the number a renewal must exceed.

---

### elapsedMs

> **elapsedMs**: `number`

Milliseconds since the turn's first request was built.

---

### toolNames

> **toolNames**: `string`[]

Names of the tools dispatched on the step that just settled, in order.

---

### signal

> **signal**: `AbortSignal`

Fires when the turn is cancelled or the callback outlives its own budget.
A callback that does real work (reading a live budget, asking a service)
must honour it — the turn does not wait for a callback that ignores it.
