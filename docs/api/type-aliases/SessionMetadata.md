[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionMetadata

# Type Alias: SessionMetadata

> **SessionMetadata** = `object`

Lightweight session metadata for efficient session listing
Contains only essential information without heavy message arrays

## Properties

### id

> **id**: `string`

---

### title

> **title**: `string`

---

### createdAt

> **createdAt**: `string`

---

### updatedAt

> **updatedAt**: `string`

---

### metadata?

> `optional` **metadata?**: `object`

Additional metadata including agentic loop reports

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]
