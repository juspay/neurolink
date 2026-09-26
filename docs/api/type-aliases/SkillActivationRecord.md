[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillActivationRecord

# Type Alias: SkillActivationRecord

> **SkillActivationRecord** = `object`

One activated skill in a session: which skill, at which version, when.
Sessions pin the version active at activation time — a mid-session skill
update never mutates instructions the model has already loaded.

## Properties

### skillId

> **skillId**: `string`

---

### name

> **name**: `string`

---

### version

> **version**: `number`

---

### activatedAt

> **activatedAt**: `string`

ISO timestamp of activation.
