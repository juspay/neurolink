[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskAnalysis

# Type Alias: TaskAnalysis

> **TaskAnalysis** = `object`

Result of task analysis

## Properties

### intent

> **intent**: `string`

Identified intent of the task

---

### entities

> **entities**: [`Entity`](Entity.md)[]

Entities extracted from the task

---

### requirements

> **requirements**: [`Requirement`](Requirement.md)[]

Requirements for completing the task

---

### complexity

> **complexity**: `"simple"` \| `"moderate"` \| `"complex"`

Task complexity assessment

---

### suggestedPrimitives

> **suggestedPrimitives**: `string`[]

Suggested primitives for handling
