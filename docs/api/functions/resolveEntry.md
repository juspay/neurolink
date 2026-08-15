[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveEntry

# Function: resolveEntry()

> **resolveEntry**(`input`, `version`): [`NormalizedKnowledgeEntry`](../type-aliases/NormalizedKnowledgeEntry.md)

Defined in: [knowledge/resolve.ts:48](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/knowledge/resolve.ts#L48)

Resolve one authored entry into a complete `NormalizedKnowledgeEntry`,
materializing every omitted optional (optional arrays to `[]`, `body` to "",
`kind` to "text", `status` to "active") so downstream code never re-checks
it. Authored arrays are cloned so the normalized snapshot is isolated from
caller-owned references.

## Parameters

### input

[`KnowledgeEntryInput`](../type-aliases/KnowledgeEntryInput.md)

### version

`string`

## Returns

[`NormalizedKnowledgeEntry`](../type-aliases/NormalizedKnowledgeEntry.md)
