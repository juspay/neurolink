[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChecklistToolResult

# Type Alias: ChecklistToolResult

> **ChecklistToolResult** = `object`

Every `tasks_*` tool returns this — the model re-anchors on the full list
on each call, which is what makes the checklist survive compaction with no
re-injection machinery.

## Properties

### items

> **items**: [`ChecklistItem`](ChecklistItem.md)[]

---

### counts

> **counts**: `Record`\<[`ChecklistItemStatus`](ChecklistItemStatus.md), `number`\>

---

### delegatesPending

> **delegatesPending**: `number`

Background delegates not yet collected (0 when delegation is unused).

---

### delegatesReady

> **delegatesReady**: `number`

---

### commandsRunning

> **commandsRunning**: `number`

Background commands still running (0 when the command primitive is
unused). Carried here for the same reason the delegate counters are: the
model learns "the build finished" from any `tasks_list`, with no polling
and no change to the core loop.

---

### commandsFinished

> **commandsFinished**: `number`

Background commands that have settled and can be read.
