[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMutationResult

# Type Alias: SkillMutationResult

> **SkillMutationResult** = `object`

Result envelope returned by SkillsManager.requestMutation().

## Properties

### decision

> **decision**: [`SkillMutationDecision`](SkillMutationDecision.md)

---

### skill?

> `optional` **skill?**: [`SkillDefinition`](SkillDefinition.md)

The resulting skill after an applied create/update (absent for delete/pending/rejected).
