[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRequestScope

# Type Alias: KnowledgeRequestScope

> **KnowledgeRequestScope** = `object`

Defined in: [types/knowledge.ts:236](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L236)

Per-call scope the host attaches to `GenerateOptions` / `StreamOptions`.
Supplies the enabled integrations for this turn only.

## Properties

### enabledIntegrations?

> `optional` **enabledIntegrations?**: `string`[]

Defined in: [types/knowledge.ts:238](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L238)

Installed/enabled integrations used to filter integration-specific entries.
