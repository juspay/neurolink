[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLExecutionState

# Type Alias: HITLExecutionState

> **HITLExecutionState** = `object`

Per-call HITL state, shared by every attempt of one `executeTool` call.

The confirmation step writes `decision` once it has decided (after the
human answered, or the wait ended), never before; an attempt that arrives
with the decision for its arguments is not asked again. A state whose `decision` is still undefined has not been
confirmed. An approval (or a `not-required` decision) covers the arguments
it was made for. A state you pass yourself is compared with a copy of
those arguments taken when the decision was made: reused with other
arguments, or with the same object changed in place since, it is decided
again and `decision` is overwritten; arguments that cannot be copied (a
function value, for example) are always decided again. A `decision` you
write yourself, rather than the confirmation step, is used as it is. The
state `executeTool` makes for its own call is bound to the arguments
object itself, so one approval covers every attempt of that call.

## Properties

### decision?

> `optional` **decision?**: [`HITLDecision`](HITLDecision.md)

Recorded after the confirmation step; undefined until then

---

### triggered?

> `readonly` `optional` **triggered?**: `boolean`

Read-only alias of `decision === "approved"`, kept for callers that read
it. Never true before the human approved. A plain object passed by a
caller does not carry it; read `decision` instead.
