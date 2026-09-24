[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterConfig

# Type Alias: ClassifierRouterConfig

> **ClassifierRouterConfig** = `object`

Defined in: [types/classifierRouter.ts:202](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L202)

Constructor-level configuration for the classifier router.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/classifierRouter.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L204)

Master switch. When false/absent, the router is never built.

---

### classifier?

> `optional` **classifier?**: [`ClassifierStrategyKind`](ClassifierStrategyKind.md)

Defined in: [types/classifierRouter.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L213)

Classification strategy. Default: "auto" — which resolves to "jev" when a
decision provider is configured, in the environment or in SDK credentials
(`TYPESAFE_API_KEY`, or `LAYA_API_KEY` with `LAYA_BASE_URL`) and
"heuristic" otherwise, so configuring one
upgrades routing without any code change. Behaviour for callers with no
key is unchanged.

---

### classifierModel?

> `optional` **classifierModel?**: [`ClassifierModelRef`](ClassifierModelRef.md)

Defined in: [types/classifierRouter.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L215)

Model used by the "llm" strategy. Defaults to provider/model auto.

---

### minUpgradeConfidence?

> `optional` **minUpgradeConfidence?**: `number`

Defined in: [types/classifierRouter.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L221)

How sure the classifier must be to route a request UP to a more capable
(costlier) model. Being wrong here costs money, so the bar is low.
Only meaningful for "jev", whose confidence is calibrated. Default: 0.3.

---

### minDowngradeConfidence?

> `optional` **minDowngradeConfidence?**: `number`

Defined in: [types/classifierRouter.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L227)

How sure it must be to route DOWN to a cheaper model. Being wrong here
means a task handled by too small a model, so the bar is high.
Default: 0.6.

---

### pool

> **pool**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Defined in: [types/classifierRouter.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L229)

The available base pool the router selects a model from.

---

### tierMap?

> `optional` **tierMap?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]\>\>

Defined in: [types/classifierRouter.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L234)

Explicit difficulty → members map. When a difficulty has entries here they
take precedence over metadata scoring of `pool`.

---

### toolDirectives?

> `optional` **toolDirectives?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierToolDirective`](ClassifierToolDirective.md)\>\>

Defined in: [types/classifierRouter.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L236)

Per-difficulty tool directives applied to the request.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/classifierRouter.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L240)

Hard timeout (ms) for the LLM classifier call. Default: 8000.

---

### catalog?

> `optional` **catalog?**: [`ClassifierCatalogConfig`](ClassifierCatalogConfig.md)

Defined in: [types/classifierRouter.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L251)

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

Defined in: [types/classifierRouter.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L258)

Ask the classifier how much context the request needs and use the answer
to lower the compaction threshold. Default: true when the strategy
resolves to a decision model, since the question rides along in a batch
that is already being sent. Ignored by the other strategies.
