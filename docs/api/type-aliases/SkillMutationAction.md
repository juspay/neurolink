[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMutationAction

# Type Alias: SkillMutationAction

> **SkillMutationAction** = \{ `type`: `"create"`; `skill`: [`SkillCreateInput`](SkillCreateInput.md); `requestedBy?`: `string`; \} \| \{ `type`: `"update"`; `skillId`: `string`; `patch`: [`SkillUpdateInput`](SkillUpdateInput.md); `requestedBy?`: `string`; \} \| \{ `type`: `"delete"`; `skillId`: `string`; `requestedBy?`: `string`; \}

Defined in: [types/skills.ts:271](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L271)

A proposed mutation, passed to the host's onMutationRequest gate.
