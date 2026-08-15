[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsConfig

# Type Alias: SkillsConfig

> **SkillsConfig** = `object`

Defined in: [types/skills.ts:305](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L305)

Instance-level skills configuration (NeuroLink constructor `skills` option).
Opt-in: nothing is registered or injected unless `enabled: true`.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/skills.ts:306](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L306)

---

### storage?

> `optional` **storage?**: [`SkillsStorageConfig`](SkillsStorageConfig.md)

Defined in: [types/skills.ts:308](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L308)

Persistence backend. Default: `{ type: "memory" }`.

---

### discovery?

> `optional` **discovery?**: [`SkillDiscoveryMode`](SkillDiscoveryMode.md)

Defined in: [types/skills.ts:319](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L319)

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

Defined in: [types/skills.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L327)

Character budget for the "tool" discovery listing. When the full
listing exceeds it, every description is shortened uniformly (first
sentence, then a hard cap) so the render stays a pure function of the
index — byte-stable across calls; names are never dropped.
Default: 15000.

---

### sessionPersistence?

> `optional` **sessionPersistence?**: `boolean`

Defined in: [types/skills.ts:334](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L334)

Pin activated skill instructions into session history so later turns
replay them verbatim (byte-stable, provider-cacheable) instead of
re-fetching the skill. Requires conversation memory + a sessionId on
the call. Default: true.

---

### maxMatches?

> `optional` **maxMatches?**: `number`

Defined in: [types/skills.ts:336](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L336)

Maximum skills hydrated (with instructions) per search. Default: 5.

---

### promptIndexMaxItems?

> `optional` **promptIndexMaxItems?**: `number`

Defined in: [types/skills.ts:342](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L342)

Maximum entries rendered by the "system-prompt" discovery mode before
truncation. Default: 50. The "tool" mode is bounded by
listingBudgetChars instead and never drops entries.

---

### indexCacheTtlMs?

> `optional` **indexCacheTtlMs?**: `number`

Defined in: [types/skills.ts:344](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L344)

Index cache TTL in milliseconds. Default: 30000. 0 disables caching.

---

### defaultScopeId?

> `optional` **defaultScopeId?**: `string`

Defined in: [types/skills.ts:346](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L346)

Default scope filter applied when a call/tool provides none.

---

### allowMutations?

> `optional` **allowMutations?**: `boolean`

Defined in: [types/skills.ts:352](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L352)

Register skill_create / skill_update / skill_delete tools so the model
can propose skill changes. Default: false. Combine with
`onMutationRequest` to gate writes behind host approval.

---

### onMutationRequest?

> `optional` **onMutationRequest?**: (`action`) => `Promise`\<[`SkillMutationDecision`](SkillMutationDecision.md)\>

Defined in: [types/skills.ts:358](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L358)

Host approval gate invoked before any mutation is applied. When absent
and allowMutations is true, mutations apply directly. Errors thrown
here reject the mutation (fail closed for writes).

#### Parameters

##### action

[`SkillMutationAction`](SkillMutationAction.md)

#### Returns

`Promise`\<[`SkillMutationDecision`](SkillMutationDecision.md)\>
