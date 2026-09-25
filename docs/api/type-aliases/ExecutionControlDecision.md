[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionControlDecision

# Type Alias: ExecutionControlDecision

> **ExecutionControlDecision** = `object`

Defined in: [types/stream.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L270)

What a `beforeStep` callback may change about the rest of the turn.

Returning nothing is a decision too: it declines the renewal, so the
existing cap stands and a turn that has reached it ends as a step-limit
outcome exactly as it would with no callback at all.

## Properties

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/stream.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L276)

A new absolute step cap. Must be finite and greater than the cap in force;
anything else is ignored, so a callback cannot shorten a turn by returning
a smaller number or unbound one by returning Infinity.

---

### nudge?

> `optional` **nudge?**: `string`

Defined in: [types/stream.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L282)

A planning nudge appended to the conversation before the next step, in the
same loop and the same history — this is how a caller tells the model that
its budget changed without restarting the turn.
