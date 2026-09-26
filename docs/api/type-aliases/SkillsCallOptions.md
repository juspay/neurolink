[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsCallOptions

# Type Alias: SkillsCallOptions

> **SkillsCallOptions** = `object`

Per-call skills control on generate()/stream(). Only effective when the
instance was constructed with skills enabled; per-call wins over instance
config (same precedence convention as per-call credentials).

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Master toggle for this call (listing + per-call tools). Default: true.

---

### discovery?

> `optional` **discovery?**: [`SkillDiscoveryMode`](SkillDiscoveryMode.md)

Per-call override of SkillsConfig.discovery.

---

### scopeId?

> `optional` **scopeId?**: `string`

Scope filter for the listing and skill resolution on this call. Overrides defaultScopeId.

---

### tags?

> `optional` **tags?**: `string`[]

Restrict the listing to skills carrying at least one of these tags.

---

### preload?

> `optional` **preload?**: `string`[]

Skill names to activate at the start of this call: their full
instructions are injected up front (and pinned to the session when
sessionPersistence is on), without waiting for the model to invoke
use_skill. Already-active skills are skipped.
