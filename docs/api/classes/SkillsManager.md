[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsManager

# Class: SkillsManager

Defined in: [skills/skillsManager.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L37)

## Constructors

### Constructor

> **new SkillsManager**(`config`): `SkillsManager`

Defined in: [skills/skillsManager.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L46)

#### Parameters

##### config

[`SkillsConfig`](../type-aliases/SkillsConfig.md)

#### Returns

`SkillsManager`

## Properties

### sessions

> `readonly` **sessions**: `SkillSessionTracker`

Defined in: [skills/skillsManager.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L44)

Per-session activation state (pinned skills).

## Accessors

### mutationsAllowed

#### Get Signature

> **get** **mutationsAllowed**(): `boolean`

Defined in: [skills/skillsManager.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L212)

Whether skill create/update/delete is enabled on this instance. Gates the
LLM-facing `skill_*` tools (registration) and the server REST mutation
routes. Direct programmatic `requestMutation` calls are intentionally not
gated, so a host can still seed skills at startup.

##### Returns

`boolean`

## Methods

### getIndex()

> **getIndex**(`forceRefresh?`): `Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

Defined in: [skills/skillsManager.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L55)

Cached index read, sorted by name. TTL 0 disables caching. Sorting
here (not per render) keeps every downstream listing byte-stable
regardless of store enumeration order.

#### Parameters

##### forceRefresh?

`boolean` = `false`

#### Returns

`Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

---

### search()

> **search**(`query`): `Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md)[]\>

Defined in: [skills/skillsManager.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L80)

Index-first search: filter the cached index, hydrate only the matched
entries (max `limit`) with instructions. Cost: one cached index read +
N_matched store gets.

#### Parameters

##### query

[`SkillSearchQuery`](../type-aliases/SkillSearchQuery.md)

#### Returns

`Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md)[]\>

---

### list()

> **list**(`scopeId?`): `Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

Defined in: [skills/skillsManager.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L97)

Index entries only — no instructions. For discovery/listing.

#### Parameters

##### scopeId?

`string`

#### Returns

`Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

---

### get()

> **get**(`idOrName`): `Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

Defined in: [skills/skillsManager.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L106)

Fetch one skill by id, falling back to name lookup.

#### Parameters

##### idOrName

`string`

#### Returns

`Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

---

### buildPromptIndex()

> **buildPromptIndex**(`options?`): `Promise`\<`string` \| `null`\>

Defined in: [skills/skillsManager.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L136)

Render the system-prompt skills index for one call, or null when
nothing is visible. Never includes instructions.

#### Parameters

##### options?

###### scopeId?

`string`

###### tags?

`string`[]

#### Returns

`Promise`\<`string` \| `null`\>

---

### buildToolListing()

> **buildToolListing**(`options?`): `Promise`\<`string` \| `null`\>

Defined in: [skills/skillsManager.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L152)

Render the `<available_skills>` block for the use_skill tool
description ("tool" discovery mode), or null when nothing is visible.
Bounded by listingBudgetChars; entries are never dropped.

#### Parameters

##### options?

###### scopeId?

`string`

###### tags?

`string`[]

#### Returns

`Promise`\<`string` \| `null`\>

---

### getResource()

> **getResource**(`idOrName`, `resourcePath`): `Promise`\<`string` \| `null`\>

Defined in: [skills/skillsManager.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L183)

Read an auxiliary resource file bundled with a skill. Paths are
relative to the skill; traversal segments are rejected. Null when the
skill, the resource, or store resource support is absent.

#### Parameters

##### idOrName

`string`

##### resourcePath

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### requestMutation()

> **requestMutation**(`action`): `Promise`\<[`SkillMutationResult`](../type-aliases/SkillMutationResult.md)\>

Defined in: [skills/skillsManager.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillsManager.ts#L221)

Gate a proposed mutation through the host's onMutationRequest hook,
then apply it when approved. No hook configured means direct apply
(the tools themselves are already gated by allowMutations).

#### Parameters

##### action

[`SkillMutationAction`](../type-aliases/SkillMutationAction.md)

#### Returns

`Promise`\<[`SkillMutationResult`](../type-aliases/SkillMutationResult.md)\>
