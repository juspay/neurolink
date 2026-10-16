[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalLangfuseEvent

# Type Alias: ServerSTTEvalLangfuseEvent

> **ServerSTTEvalLangfuseEvent** = `object`

One event of Langfuse's public ingestion API (`POST /api/public/ingestion`).

## Properties

### id

> **id**: `string`

---

### timestamp

> **timestamp**: `string`

---

### type

> **type**: `"trace-create"` \| `"event-create"` \| `"score-create"`

---

### body

> **body**: `Record`\<`string`, `unknown`\>
