[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMutationDecision

# Type Alias: SkillMutationDecision

> **SkillMutationDecision** = \{ `outcome`: `"approved"`; \} \| \{ `outcome`: `"rejected"`; `reason?`: `string`; \} \| \{ `outcome`: `"pending"`; `reference?`: `string`; \}

Defined in: [types/skills.ts:289](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L289)

Host decision for a proposed mutation.

- "approved": NeuroLink applies the mutation immediately.
- "rejected": nothing is written; `reason` is surfaced to the model.
- "pending": the host queued the action for out-of-band approval
  (e.g. a Slack maker-checker flow) and will apply it itself later;
  `reference` is surfaced to the model (e.g. an approval ticket id).
