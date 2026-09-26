[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsConfig

# Type Alias: SkillsConfig

> **SkillsConfig** = `object`

Instance-level skills configuration (NeuroLink constructor `skills` option).
Opt-in: nothing is registered or injected unless `enabled: true`.

## Properties

### enabled

> **enabled**: `boolean`

---

### storage?

> `optional` **storage?**: [`SkillsStorageConfig`](SkillsStorageConfig.md)

Persistence backend. Default: `{ type: "memory" }`.

---

### discovery?

> `optional` **discovery?**: [`SkillDiscoveryMode`](SkillDiscoveryMode.md)

Where the skills listing (names + descriptions, never instructions)
surfaces for model-driven discovery:

- "tool" (default): an `<available_skills>` block embedded in the
  use_skill tool description — the Claude Code pattern. Keeps the
  host's system prompt untouched and the listing cache-stable.
- "system-prompt": a "## Available Skills" index appended to the
  system prompt instead.
- "none": no listing anywhere; discovery only via list_skills.

---

### listingBudgetChars?

> `optional` **listingBudgetChars?**: `number`

Character budget for the "tool" discovery listing. When the full
listing exceeds it, every description is shortened uniformly (first
sentence, then a hard cap) so the render stays a pure function of the
index — byte-stable across calls; names are never dropped.
Default: 15000.

---

### sessionPersistence?

> `optional` **sessionPersistence?**: `boolean`

Pin activated skill instructions into session history so later turns
replay them verbatim (byte-stable, provider-cacheable) instead of
re-fetching the skill. Requires conversation memory + a sessionId on
the call. Default: true.

---

### maxMatches?

> `optional` **maxMatches?**: `number`

Maximum skills hydrated (with instructions) per search. Default: 5.

---

### promptIndexMaxItems?

> `optional` **promptIndexMaxItems?**: `number`

Maximum entries rendered by the "system-prompt" discovery mode before
truncation. Default: 50. The "tool" mode is bounded by
listingBudgetChars instead and never drops entries.

---

### indexCacheTtlMs?

> `optional` **indexCacheTtlMs?**: `number`

Index cache TTL in milliseconds. Default: 30000. 0 disables caching.

---

### defaultScopeId?

> `optional` **defaultScopeId?**: `string`

Default scope filter applied when a call/tool provides none.

---

### allowMutations?

> `optional` **allowMutations?**: `boolean`

Register skill_create / skill_update / skill_delete tools so the model
can propose skill changes. Default: false. Combine with
`onMutationRequest` to gate writes behind host approval.

---

### onMutationRequest?

> `optional` **onMutationRequest?**: (`action`) => `Promise`\<[`SkillMutationDecision`](SkillMutationDecision.md)\>

Host approval gate invoked before any mutation is applied. When absent
and allowMutations is true, mutations apply directly. Errors thrown
here reject the mutation (fail closed for writes).

#### Parameters

##### action

[`SkillMutationAction`](SkillMutationAction.md)

#### Returns

`Promise`\<[`SkillMutationDecision`](SkillMutationDecision.md)\>
