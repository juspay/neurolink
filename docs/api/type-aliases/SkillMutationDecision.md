[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMutationDecision

# Type Alias: SkillMutationDecision

> **SkillMutationDecision** = \{ `outcome`: `"approved"`; \} \| \{ `outcome`: `"rejected"`; `reason?`: `string`; \} \| \{ `outcome`: `"pending"`; `reference?`: `string`; \}

Defined in: [types/skills.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L289)

Host decision for a proposed mutation.

- "approved": NeuroLink applies the mutation immediately.
- "rejected": nothing is written; `reason` is surfaced to the model.
- "pending": the host queued the action for out-of-band approval
  (e.g. a Slack maker-checker flow) and will apply it itself later;
  `reference` is surfaced to the model (e.g. an approval ticket id).
