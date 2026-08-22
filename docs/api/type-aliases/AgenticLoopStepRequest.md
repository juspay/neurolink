[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopStepRequest

# Type Alias: AgenticLoopStepRequest

> **AgenticLoopStepRequest** = `object`

Defined in: [types/loopEngine.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L70)

## Properties

### raw

> **raw**: `unknown`

Defined in: [types/loopEngine.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L71)

---

### hydratedToolNames?

> `optional` **hydratedToolNames?**: `string`[]

Defined in: [types/loopEngine.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L83)

Tools that became callable while this step's request was being built —
mid-turn discovery hydrating a name the model had already tried.

The engine clears each one's failure strikes before dispatching, because
TOOL_NOT_FOUND strikes accrued while a tool was deferred are snapshot
artifacts rather than real failures. Clearing them at the miss-resolution
path instead would be too late: the breaker is consulted BEFORE the
lookup, so a tool already at the strike limit is refused without the
resolution path ever running.
