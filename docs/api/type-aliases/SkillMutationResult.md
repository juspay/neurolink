[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMutationResult

# Type Alias: SkillMutationResult

> **SkillMutationResult** = `object`

Defined in: [types/skills.ts:295](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L295)

Result envelope returned by SkillsManager.requestMutation().

## Properties

### decision

> **decision**: [`SkillMutationDecision`](SkillMutationDecision.md)

Defined in: [types/skills.ts:296](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L296)

---

### skill?

> `optional` **skill?**: [`SkillDefinition`](SkillDefinition.md)

Defined in: [types/skills.ts:298](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L298)

The resulting skill after an applied create/update (absent for delete/pending/rejected).
