[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsCallOptions

# Type Alias: SkillsCallOptions

> **SkillsCallOptions** = `object`

Defined in: [types/skills.ts:451](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L451)

Per-call skills control on generate()/stream(). Only effective when the
instance was constructed with skills enabled; per-call wins over instance
config (same precedence convention as per-call credentials).

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/skills.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L453)

Master toggle for this call (listing + per-call tools). Default: true.

---

### discovery?

> `optional` **discovery?**: [`SkillDiscoveryMode`](SkillDiscoveryMode.md)

Defined in: [types/skills.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L455)

Per-call override of SkillsConfig.discovery.

---

### scopeId?

> `optional` **scopeId?**: `string`

Defined in: [types/skills.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L457)

Scope filter for the listing and skill resolution on this call. Overrides defaultScopeId.

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/skills.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L459)

Restrict the listing to skills carrying at least one of these tags.

---

### preload?

> `optional` **preload?**: `string`[]

Defined in: [types/skills.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L466)

Skill names to activate at the start of this call: their full
instructions are injected up front (and pinned to the session when
sessionPersistence is on), without waiting for the model to invoke
use_skill. Already-active skills are skipped.
