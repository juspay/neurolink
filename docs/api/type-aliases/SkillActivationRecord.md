[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillActivationRecord

# Type Alias: SkillActivationRecord

> **SkillActivationRecord** = `object`

Defined in: [types/skills.ts:371](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L371)

One activated skill in a session: which skill, at which version, when.
Sessions pin the version active at activation time — a mid-session skill
update never mutates instructions the model has already loaded.

## Properties

### skillId

> **skillId**: `string`

Defined in: [types/skills.ts:372](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L372)

---

### name

> **name**: `string`

Defined in: [types/skills.ts:373](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L373)

---

### version

> **version**: `number`

Defined in: [types/skills.ts:374](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L374)

---

### activatedAt

> **activatedAt**: `string`

Defined in: [types/skills.ts:376](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L376)

ISO timestamp of activation.
