[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterConfig

# Type Alias: ClassifierRouterConfig

> **ClassifierRouterConfig** = `object`

Defined in: [types/classifierRouter.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L200)

Constructor-level configuration for the classifier router.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/classifierRouter.ts:202](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L202)

Master switch. When false/absent, the router is never built.

---

### classifier?

> `optional` **classifier?**: [`ClassifierStrategyKind`](ClassifierStrategyKind.md)

Defined in: [types/classifierRouter.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L209)

Classification strategy. Default: "auto" — which resolves to "jev" when
`TYPESAFE_API_KEY` is set and "heuristic" otherwise, so configuring a key
upgrades routing without any code change. Behaviour for callers with no
key is unchanged.

---

### classifierModel?

> `optional` **classifierModel?**: [`ClassifierModelRef`](ClassifierModelRef.md)

Defined in: [types/classifierRouter.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L211)

Model used by the "llm" strategy. Defaults to provider/model auto.

---

### minUpgradeConfidence?

> `optional` **minUpgradeConfidence?**: `number`

Defined in: [types/classifierRouter.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L217)

How sure the classifier must be to route a request UP to a more capable
(costlier) model. Being wrong here costs money, so the bar is low.
Only meaningful for "jev", whose confidence is calibrated. Default: 0.3.

---

### minDowngradeConfidence?

> `optional` **minDowngradeConfidence?**: `number`

Defined in: [types/classifierRouter.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L223)

How sure it must be to route DOWN to a cheaper model. Being wrong here
means a task handled by too small a model, so the bar is high.
Default: 0.6.

---

### pool

> **pool**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Defined in: [types/classifierRouter.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L225)

The available base pool the router selects a model from.

---

### tierMap?

> `optional` **tierMap?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]\>\>

Defined in: [types/classifierRouter.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L230)

Explicit difficulty → members map. When a difficulty has entries here they
take precedence over metadata scoring of `pool`.

---

### toolDirectives?

> `optional` **toolDirectives?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierToolDirective`](ClassifierToolDirective.md)\>\>

Defined in: [types/classifierRouter.ts:232](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L232)

Per-difficulty tool directives applied to the request.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/classifierRouter.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L236)

Hard timeout (ms) for the LLM classifier call. Default: 8000.

---

### catalog?

> `optional` **catalog?**: [`ClassifierCatalogConfig`](ClassifierCatalogConfig.md)

Defined in: [types/classifierRouter.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L247)

Widen the pool with every model the registry knows about that this host
actually has credentials for.

Off by default, and deliberately so: the declared `pool` is a statement
about which models a host is _willing_ to be billed for, and NeuroLink
cannot invent that. Turning this on says "anything I have a key for is
fair game", which is exactly right for a CLI and exactly wrong for a
service with a negotiated model list.

---

### contextBudget?

> `optional` **contextBudget?**: `boolean`

Defined in: [types/classifierRouter.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L254)

Ask the classifier how much context the request needs and use the answer
to lower the compaction threshold. Default: true when the strategy
resolves to a decision model, since the question rides along in a batch
that is already being sent. Ignored by the other strategies.
