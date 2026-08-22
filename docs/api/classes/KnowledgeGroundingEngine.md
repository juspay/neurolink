[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingEngine

# Class: KnowledgeGroundingEngine

Defined in: [knowledge/engine.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/engine.ts#L73)

## Constructors

### Constructor

> **new KnowledgeGroundingEngine**(`config`, `now?`): `KnowledgeGroundingEngine`

Defined in: [knowledge/engine.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/engine.ts#L82)

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

Defined in: [knowledge/engine.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/engine.ts#L96)

#### Returns

`boolean`

---

### ready()

> **ready**(): `Promise`\<`void`\>

Defined in: [knowledge/engine.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/engine.ts#L101)

Resolve once the one-time build settles. Safe to call before every turn.

#### Returns

`Promise`\<`void`\>

---

### getStatus()

> **getStatus**(): [`KnowledgeEngineStatus`](../type-aliases/KnowledgeEngineStatus.md)

Defined in: [knowledge/engine.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/engine.ts#L107)

#### Returns

[`KnowledgeEngineStatus`](../type-aliases/KnowledgeEngineStatus.md)

---

### ground()

> **ground**(`input`): `Promise`\<[`KnowledgeGroundingOutcome`](../type-aliases/KnowledgeGroundingOutcome.md)\>

Defined in: [knowledge/engine.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/engine.ts#L153)

Retrieve + assemble for one turn. Returns the ephemeral context to inject
(or null), aggregate metadata, and the full retrieval. Never throws.

#### Parameters

##### input

[`KnowledgeGroundingInput`](../type-aliases/KnowledgeGroundingInput.md)

#### Returns

`Promise`\<[`KnowledgeGroundingOutcome`](../type-aliases/KnowledgeGroundingOutcome.md)\>
