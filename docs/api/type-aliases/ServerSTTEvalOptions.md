[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalOptions

# Type Alias: ServerSTTEvalOptions

> **ServerSTTEvalOptions** = `object`

Where and how much the STT evaluation collector keeps.

## Properties

### dir?

> `optional` **dir?**: `string`

Directory for one JSON-lines file per call, replayed on start. Default
`NEUROLINK_STT_EVAL_DIR`; without either, calls live in memory only.

---

### maxCalls?

> `optional` **maxCalls?**: `number`

Calls held in memory; the least recently updated are evicted (still on disk). Default 1000.

---

### maxSegmentsPerCall?

> `optional` **maxSegmentsPerCall?**: `number`

Segments kept per call; later new ids are counted as `ignored`. Default 50,000.
