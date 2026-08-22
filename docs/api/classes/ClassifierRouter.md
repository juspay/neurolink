[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouter

# Class: ClassifierRouter

Defined in: [routing/classifierRouter.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/classifierRouter.ts#L53)

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

Defined in: [routing/classifierRouter.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/classifierRouter.ts#L56)

#### Parameters

##### config

[`ClassifierRouterConfig`](../type-aliases/ClassifierRouterConfig.md)

##### deps?

[`ClassifierRouterDeps`](../type-aliases/ClassifierRouterDeps.md) = `{}`

#### Returns

`ClassifierRouter`

## Methods

### route()

> **route**(`input`): `Promise`\<[`ClassifierRouterDecision`](../type-aliases/ClassifierRouterDecision.md) \| `null`\>

Defined in: [routing/classifierRouter.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/classifierRouter.ts#L65)

Classify the request and produce a combined model + tool decision, or
`null` when nothing should change. Never throws (fails open).

#### Parameters

##### input

[`ClassifierRouterInput`](../type-aliases/ClassifierRouterInput.md)

#### Returns

`Promise`\<[`ClassifierRouterDecision`](../type-aliases/ClassifierRouterDecision.md) \| `null`\>
