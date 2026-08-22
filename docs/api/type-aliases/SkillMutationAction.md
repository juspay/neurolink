[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMutationAction

# Type Alias: SkillMutationAction

> **SkillMutationAction** = \{ `type`: `"create"`; `skill`: [`SkillCreateInput`](SkillCreateInput.md); `requestedBy?`: `string`; \} \| \{ `type`: `"update"`; `skillId`: `string`; `patch`: [`SkillUpdateInput`](SkillUpdateInput.md); `requestedBy?`: `string`; \} \| \{ `type`: `"delete"`; `skillId`: `string`; `requestedBy?`: `string`; \}

Defined in: [types/skills.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L271)

A proposed mutation, passed to the host's onMutationRequest gate.
