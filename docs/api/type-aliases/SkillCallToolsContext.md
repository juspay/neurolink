[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillCallToolsContext

# Type Alias: SkillCallToolsContext

> **SkillCallToolsContext** = `object`

Defined in: [types/skills.ts:418](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L418)

Per-call context bound into the use_skill / read_skill_resource tools at
injection time (prepareGenerate/prepareStream). The sessionId is captured
by closure so activation state is tracked without relying on runtime tool
context plumbing.

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/skills.ts:420](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L420)

Session the call belongs to; absent → activation state is per-turn only.

---

### scopeId?

> `optional` **scopeId?**: `string`

Defined in: [types/skills.ts:422](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L422)

Scope filter applied when resolving skills for this call.

---

### sessionPersistence

> **sessionPersistence**: `boolean`

Defined in: [types/skills.ts:427](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L427)

Pin activated instructions into session history after the turn.
Mirrors SkillsConfig.sessionPersistence resolved for this call.

---

### discovery

> **discovery**: [`SkillDiscoveryMode`](SkillDiscoveryMode.md)

Defined in: [types/skills.ts:429](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L429)

Discovery mode resolved for this call — shapes the use_skill description.

---

### listing?

> `optional` **listing?**: `string` \| `null`

Defined in: [types/skills.ts:431](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L431)

Rendered `<available_skills>` block for "tool" discovery; null when empty.

---

### getStoredMessages?

> `optional` **getStoredMessages?**: (`sessionId`) => `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

Defined in: [types/skills.ts:437](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L437)

Stored session history loader used to hydrate activation state before
every dedup check (restart/multi-instance/failed-persistence safety).
Invoked once per use_skill / read_skill_resource attempt.

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`ChatMessage`](ChatMessage.md)[]\>
