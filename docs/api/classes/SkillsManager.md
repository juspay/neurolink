[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsManager

# Class: SkillsManager

## Constructors

### Constructor

> **new SkillsManager**(`config`): `SkillsManager`

#### Parameters

##### config

[`SkillsConfig`](../type-aliases/SkillsConfig.md)

#### Returns

`SkillsManager`

## Properties

### sessions

> `readonly` **sessions**: `SkillSessionTracker`

Per-session activation state (pinned skills).

## Accessors

### mutationsAllowed

#### Get Signature

> **get** **mutationsAllowed**(): `boolean`

Whether skill create/update/delete is enabled on this instance. Gates the
LLM-facing `skill_*` tools (registration) and the server REST mutation
routes. Direct programmatic `requestMutation` calls are intentionally not
gated, so a host can still seed skills at startup.

##### Returns

`boolean`

## Methods

### getIndex()

> **getIndex**(`forceRefresh?`): `Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

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

Index entries only — no instructions. For discovery/listing.

#### Parameters

##### scopeId?

`string`

#### Returns

`Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

---

### get()

> **get**(`idOrName`): `Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

Fetch one skill by id, falling back to name lookup.

#### Parameters

##### idOrName

`string`

#### Returns

`Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

---

### buildPromptIndex()

> **buildPromptIndex**(`options?`): `Promise`\<`string` \| `null`\>

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

Gate a proposed mutation through the host's onMutationRequest hook,
then apply it when approved. No hook configured means direct apply
(the tools themselves are already gated by allowMutations).

#### Parameters

##### action

[`SkillMutationAction`](../type-aliases/SkillMutationAction.md)

#### Returns

`Promise`\<[`SkillMutationResult`](../type-aliases/SkillMutationResult.md)\>
