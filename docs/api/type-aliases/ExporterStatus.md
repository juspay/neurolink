[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterStatus

# Type Alias: ExporterStatus

> **ExporterStatus** = `object`

Point-in-time state of one registered exporter, as `getTelemetryStatus()` and
the CLI status commands report it. `pendingSpans` counts spans queued and not
yet handed to the network; `deliveredSpans` and `failedSpans` count what the
backend accepted and what was dropped since the process started.

## Properties

### name

> **name**: `string`

---

### enabled

> **enabled**: `boolean`

---

### healthy

> **healthy**: `boolean`

---

### pendingSpans

> **pendingSpans**: `number`

---

### deliveredSpans

> **deliveredSpans**: `number`

---

### failedSpans

> **failedSpans**: `number`

---

### lastExportTime?

> `optional` **lastExportTime?**: `string`

ISO timestamp of the last export that delivered spans

---

### errors?

> `optional` **errors?**: `string`[]
