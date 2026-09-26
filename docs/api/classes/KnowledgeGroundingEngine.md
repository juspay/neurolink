[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingEngine

# Class: KnowledgeGroundingEngine

## Constructors

### Constructor

> **new KnowledgeGroundingEngine**(`config`, `now?`): `KnowledgeGroundingEngine`

#### Parameters

##### config

[`KnowledgeGroundingConfig`](../type-aliases/KnowledgeGroundingConfig.md)

##### now?

() => `number`

#### Returns

`KnowledgeGroundingEngine`

## Methods

### isEnabled()

> **isEnabled**(): `boolean`

#### Returns

`boolean`

---

### ready()

> **ready**(): `Promise`\<`void`\>

Resolve once the one-time build settles. Safe to call before every turn.

#### Returns

`Promise`\<`void`\>

---

### getStatus()

> **getStatus**(): [`KnowledgeEngineStatus`](../type-aliases/KnowledgeEngineStatus.md)

#### Returns

[`KnowledgeEngineStatus`](../type-aliases/KnowledgeEngineStatus.md)

---

### ground()

> **ground**(`input`): `Promise`\<[`KnowledgeGroundingOutcome`](../type-aliases/KnowledgeGroundingOutcome.md)\>

Retrieve + assemble for one turn. Returns the ephemeral context to inject
(or null), aggregate metadata, and the full retrieval. Never throws.

#### Parameters

##### input

[`KnowledgeGroundingInput`](../type-aliases/KnowledgeGroundingInput.md)

#### Returns

`Promise`\<[`KnowledgeGroundingOutcome`](../type-aliases/KnowledgeGroundingOutcome.md)\>
