[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentWasteThresholds

# Type Alias: AgentWasteThresholds

> **AgentWasteThresholds** = `object`

Defined in: [types/isolatedAgent.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L178)

Mechanical waste-signature thresholds, checked per tool call. A tripped
signature ends the leg early with `wasteSignals` populated.

## Properties

### duplicateCallLimit?

> `optional` **duplicateCallLimit?**: `number`

Defined in: [types/isolatedAgent.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L183)

Max times the same call hash (tool + normalized params) may be seen in
one run before tripping (default 2 — the third identical call trips).

---

### emptyResultStreakLimit?

> `optional` **emptyResultStreakLimit?**: `number`

Defined in: [types/isolatedAgent.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L185)

Consecutive empty/zero-result calls before tripping (default 3).

---

### errorStreakLimit?

> `optional` **errorStreakLimit?**: `number`

Defined in: [types/isolatedAgent.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L187)

Consecutive error results before tripping (default 3).

---

### noNewResultsLimit?

> `optional` **noNewResultsLimit?**: `number`

Defined in: [types/isolatedAgent.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L192)

Calls without a new distinct result payload before tripping
(default 8).
