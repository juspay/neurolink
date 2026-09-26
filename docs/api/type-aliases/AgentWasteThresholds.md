[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentWasteThresholds

# Type Alias: AgentWasteThresholds

> **AgentWasteThresholds** = `object`

Mechanical waste-signature thresholds, checked per tool call. A tripped
signature ends the leg early with `wasteSignals` populated.

## Properties

### duplicateCallLimit?

> `optional` **duplicateCallLimit?**: `number`

Max times the same call hash (tool + normalized params) may be seen in
one run before tripping (default 2 — the third identical call trips).

---

### emptyResultStreakLimit?

> `optional` **emptyResultStreakLimit?**: `number`

Consecutive empty/zero-result calls before tripping (default 3).

---

### errorStreakLimit?

> `optional` **errorStreakLimit?**: `number`

Consecutive error results before tripping (default 3).

---

### noNewResultsLimit?

> `optional` **noNewResultsLimit?**: `number`

Calls without a new distinct result payload before tripping
(default 8).
