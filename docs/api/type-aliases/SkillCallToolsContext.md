[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillCallToolsContext

# Type Alias: SkillCallToolsContext

> **SkillCallToolsContext** = `object`

Per-call context bound into the use_skill / read_skill_resource tools at
injection time (prepareGenerate/prepareStream). The sessionId is captured
by closure so activation state is tracked without relying on runtime tool
context plumbing.

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Session the call belongs to; absent → activation state is per-turn only.

---

### scopeId?

> `optional` **scopeId?**: `string`

Scope filter applied when resolving skills for this call.

---

### sessionPersistence

> **sessionPersistence**: `boolean`

Pin activated instructions into session history after the turn.
Mirrors SkillsConfig.sessionPersistence resolved for this call.

---

### discovery

> **discovery**: [`SkillDiscoveryMode`](SkillDiscoveryMode.md)

Discovery mode resolved for this call — shapes the use_skill description.

---

### listing?

> `optional` **listing?**: `string` \| `null`

Rendered `<available_skills>` block for "tool" discovery; null when empty.

---

### getStoredMessages?

> `optional` **getStoredMessages?**: (`sessionId`) => `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

Stored session history loader used to hydrate activation state before
every dedup check (restart/multi-instance/failed-persistence safety).
Invoked once per use_skill / read_skill_resource attempt.

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`ChatMessage`](ChatMessage.md)[]\>
