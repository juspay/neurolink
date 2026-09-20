[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouter

# Class: ClassifierRouter

Defined in: [routing/classifierRouter.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierRouter.ts#L68)

ModelPool and RequestRouter — opt-in multi-provider failover with
error-class-aware cooldown, and a pluggable pre-call provider/model router.

## Examples

```typescript
import { ModelPool, classifyProviderError } from "@juspay/neurolink";

const pool = new ModelPool({
  members: [
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "vertex", model: "gemini-2.5-flash" },
  ],
  strategy: "priority",
  cooldownMs: 30_000,
});
```

```typescript
import { createDefaultRequestRouter } from "@juspay/neurolink";

const router = createDefaultRequestRouter({
  visionTier: { provider: "vertex", model: "gemini-2.5-pro" },
  largeTier: { provider: "anthropic", model: "claude-opus-4-5" },
  smallTier: { provider: "anthropic", model: "claude-haiku-3-5" },
});
```

## Constructors

### Constructor

> **new ClassifierRouter**(`config`, `deps?`): `ClassifierRouter`

Defined in: [routing/classifierRouter.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierRouter.ts#L82)

#### Parameters

##### config

[`ClassifierRouterConfig`](../type-aliases/ClassifierRouterConfig.md)

##### deps?

[`ClassifierRouterDeps`](../type-aliases/ClassifierRouterDeps.md) = `{}`

#### Returns

`ClassifierRouter`

## Methods

### setPool()

> **setPool**(`members`): `number`

Defined in: [routing/classifierRouter.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierRouter.ts#L121)

Replace the routable pool at runtime. Returns the new size.

Clears the metadata cache, since a member's declared cost/quality is
cached per `provider::model` and a replacement pool may declare different
values for the same pair.

#### Parameters

##### members

[`ClassifierRouterPoolMember`](../type-aliases/ClassifierRouterPoolMember.md)[]

#### Returns

`number`

---

### getPool()

> **getPool**(): [`ClassifierRouterPoolMember`](../type-aliases/ClassifierRouterPoolMember.md)[]

Defined in: [routing/classifierRouter.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierRouter.ts#L128)

The pool currently routed over, declared plus catalogue.

#### Returns

[`ClassifierRouterPoolMember`](../type-aliases/ClassifierRouterPoolMember.md)[]

---

### refreshCatalog()

> **refreshCatalog**(): `number`

Defined in: [routing/classifierRouter.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierRouter.ts#L133)

Rebuild the catalogue half of the pool (e.g. after credentials change).

#### Returns

`number`

---

### route()

> **route**(`input`): `Promise`\<[`ClassifierRouterDecision`](../type-aliases/ClassifierRouterDecision.md) \| `null`\>

Defined in: [routing/classifierRouter.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierRouter.ts#L143)

Classify the request and produce a combined model + tool decision, or
`null` when nothing should change. Never throws (fails open).

#### Parameters

##### input

[`ClassifierRouterInput`](../type-aliases/ClassifierRouterInput.md)

#### Returns

`Promise`\<[`ClassifierRouterDecision`](../type-aliases/ClassifierRouterDecision.md) \| `null`\>
