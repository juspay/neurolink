[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterConfig

# Type Alias: ClassifierRouterConfig

> **ClassifierRouterConfig** = `object`

Defined in: [types/classifierRouter.ts:115](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L115)

Constructor-level configuration for the classifier router.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/classifierRouter.ts:117](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L117)

Master switch. When false/absent, the router is never built.

---

### classifier?

> `optional` **classifier?**: [`ClassifierStrategyKind`](ClassifierStrategyKind.md)

Defined in: [types/classifierRouter.ts:122](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L122)

Classification strategy. Default: "heuristic" (no LLM, zero added latency).
"llm" runs a cheap classifier model (see `classifierModel`).

---

### classifierModel?

> `optional` **classifierModel?**: [`ClassifierModelRef`](ClassifierModelRef.md)

Defined in: [types/classifierRouter.ts:124](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L124)

Model used by the "llm" strategy. Defaults to provider/model auto.

---

### pool

> **pool**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Defined in: [types/classifierRouter.ts:126](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L126)

The available base pool the router selects a model from.

---

### tierMap?

> `optional` **tierMap?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]\>\>

Defined in: [types/classifierRouter.ts:131](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L131)

Explicit difficulty → members map. When a difficulty has entries here they
take precedence over metadata scoring of `pool`.

---

### toolDirectives?

> `optional` **toolDirectives?**: `Partial`\<`Record`\<[`ClassifierDifficulty`](ClassifierDifficulty.md), [`ClassifierToolDirective`](ClassifierToolDirective.md)\>\>

Defined in: [types/classifierRouter.ts:133](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L133)

Per-difficulty tool directives applied to the request.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/classifierRouter.ts:137](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L137)

Hard timeout (ms) for the LLM classifier call. Default: 8000.
