[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterConfig

# Type Alias: ClassifierRouterConfig

> **ClassifierRouterConfig** = `object`

Constructor-level configuration for the classifier router.

## Properties

### enabled

> **enabled**: `boolean`

Master switch. When false/absent, the router is never built.

---

### classifier?

> `optional` **classifier?**: [`ClassifierStrategyKind`](ClassifierStrategyKind.md)

Classification strategy. Default: "auto" — which resolves to "jev" when a
decision provider is configured, in the environment or in SDK credentials
(`TYPESAFE_API_KEY`, `LAYA_API_KEY` with `LAYA_BASE_URL`,
`XOR_API_KEY` with `XOR_BASE_URL`, `SUBQ_API_KEY`, `PERPLEXITY_API_KEY`,
`CLOUDFLARE_API_KEY` with `CLOUDFLARE_ACCOUNT_ID`, `OPENAI_API_KEY` or
`SCALEDOWN_API_KEY`) and "heuristic" otherwise, so configuring one upgrades routing without any code
change. Behaviour for a caller with none of these is unchanged. Three of them
are shared with a text provider and count here too: `PERPLEXITY_API_KEY`
(Perplexity's), the Cloudflare pair (Workers AI's) and `OPENAI_API_KEY` (the
OpenAI chat provider's). A caller whose only key is `OPENAI_API_KEY` now
resolves to "jev", answered by OpenAI Decisions (the default decision
provider whenever none ahead of it in the order is configured); each
classification is then a paid call that still falls back to the heuristic
on any failure. The exception is a key that sits beside an
`OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` naming a host other than
`https://api.openai.com`: that key is a gateway's and does not count.

---

### classifierModel?

> `optional` **classifierModel?**: [`ClassifierModelRef`](ClassifierModelRef.md)

Model used by the "llm" strategy. Defaults to provider/model auto.

---

### minUpgradeConfidence?

> `optional` **minUpgradeConfidence?**: `number`

How sure the classifier must be to route a request UP to a more capable
(costlier) model. Being wrong here costs money, so the bar is low.
Only meaningful for "jev", whose confidence is calibrated. Default: 0.3.

---

### minDowngradeConfidence?

> `optional` **minDowngradeConfidence?**: `number`

How sure it must be to route DOWN to a cheaper model. Being wrong here
means a task handled by too small a model, so the bar is high.
Default: 0.6.

---

### pool

> **pool**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

The available base pool the router selects a model from.

---

### tierMap?

> `optional` **tierMap?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]\>\>

Explicit difficulty → members map. When a difficulty has entries here they
take precedence over metadata scoring of `pool`.

---

### toolDirectives?

> `optional` **toolDirectives?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierToolDirective`](ClassifierToolDirective.md)\>\>

Per-difficulty tool directives applied to the request.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Hard timeout (ms) for the LLM classifier call. Default: 8000.

---

### catalog?

> `optional` **catalog?**: [`ClassifierCatalogConfig`](ClassifierCatalogConfig.md)

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

Ask the classifier how much context the request needs and use the answer
to lower the compaction threshold. Default: true when the strategy
resolves to a decision model, since the question rides along in a batch
that is already being sent. Ignored by the other strategies.
