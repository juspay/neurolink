[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChecklistToolResult

# Type Alias: ChecklistToolResult

> **ChecklistToolResult** = `object`

Defined in: [types/tasks.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L71)

Every `tasks_*` tool returns this — the model re-anchors on the full list
on each call, which is what makes the checklist survive compaction with no
re-injection machinery.

## Properties

### items

> **items**: [`ChecklistItem`](ChecklistItem.md)[]

Defined in: [types/tasks.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L72)

---

### counts

> **counts**: `Record`\<[`ChecklistItemStatus`](ChecklistItemStatus.md), `number`\>

Defined in: [types/tasks.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L73)

---

### delegatesPending

> **delegatesPending**: `number`

Defined in: [types/tasks.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L75)

Background delegates not yet collected (0 when delegation is unused).

---

### delegatesReady

> **delegatesReady**: `number`

Defined in: [types/tasks.ts:76](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L76)

---

### commandsRunning

> **commandsRunning**: `number`

Defined in: [types/tasks.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L83)

Background commands still running (0 when the command primitive is
unused). Carried here for the same reason the delegate counters are: the
model learns "the build finished" from any `tasks_list`, with no polling
and no change to the core loop.

---

### commandsFinished

> **commandsFinished**: `number`

Defined in: [types/tasks.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L85)

Background commands that have settled and can be read.
