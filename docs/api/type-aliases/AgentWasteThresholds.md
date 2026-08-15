[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentWasteThresholds

# Type Alias: AgentWasteThresholds

> **AgentWasteThresholds** = `object`

Defined in: [types/isolatedAgent.ts:169](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L169)

Mechanical waste-signature thresholds, checked per tool call. A tripped
signature ends the leg early with `wasteSignals` populated.

## Properties

### duplicateCallLimit?

> `optional` **duplicateCallLimit?**: `number`

Defined in: [types/isolatedAgent.ts:174](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L174)

Max times the same call hash (tool + normalized params) may be seen in
one run before tripping (default 2 — the third identical call trips).

---

### emptyResultStreakLimit?

> `optional` **emptyResultStreakLimit?**: `number`

Defined in: [types/isolatedAgent.ts:176](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L176)

Consecutive empty/zero-result calls before tripping (default 3).

---

### errorStreakLimit?

> `optional` **errorStreakLimit?**: `number`

Defined in: [types/isolatedAgent.ts:178](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L178)

Consecutive error results before tripping (default 3).

---

### noNewResultsLimit?

> `optional` **noNewResultsLimit?**: `number`

Defined in: [types/isolatedAgent.ts:183](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L183)

Calls without a new distinct result payload before tripping
(default 8).
