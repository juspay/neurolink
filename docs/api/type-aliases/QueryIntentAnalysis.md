[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryIntentAnalysis

# Type Alias: QueryIntentAnalysis

> **QueryIntentAnalysis** = `object`

Represents the analysis of the user's query intent.
This provides a basic understanding of what the user is trying to achieve.

## Properties

### type

> **type**: `"question"` \| `"command"` \| `"greeting"` \| `"unknown"`

The type of query, e.g., asking a question or giving a command.

---

### complexity

> **complexity**: `"low"` \| `"medium"` \| `"high"`

The estimated complexity of the query.

---

### shouldHaveUsedTools

> **shouldHaveUsedTools**: `boolean`

Whether the query likely required the use of tools to be answered correctly.
