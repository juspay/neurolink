[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierDecision

# Type Alias: ClassifierDecision

> **ClassifierDecision** = `object`

Defined in: [types/classifierRouter.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L58)

The classifier's verdict for a single request. Strategy-agnostic: produced
by both the heuristic and the LLM classifier.

## Properties

### difficulty

> **difficulty**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

Defined in: [types/classifierRouter.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L60)

The classified difficulty bucket.

---

### confidence

> **confidence**: `number`

Defined in: [types/classifierRouter.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L62)

Confidence in the classification (0–1).

---

### requiredCapabilities?

> `optional` **requiredCapabilities?**: `string`[]

Defined in: [types/classifierRouter.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L64)

Capability tags the request needs (e.g. "vision", "tools", "reasoning").

---

### suggestedTools?

> `optional` **suggestedTools?**: `string`[]

Defined in: [types/classifierRouter.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L66)

Tool names the classifier thinks the task needs (allowlist hint).

---

### selectedModelId?

> `optional` **selectedModelId?**: `string`

Defined in: [types/classifierRouter.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L71)

When the LLM classifier picks a model directly, the chosen candidate id
(matches a `ClassifierCandidate.id`). Ignored by the heuristic classifier.

---

### selectedModelConfidence?

> `optional` **selectedModelConfidence?**: `number`

Defined in: [types/classifierRouter.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L83)

Confidence in `selectedModelId`, when the strategy reports one.

Separate from `confidence`, which is about the DIFFICULTY verdict: a
classifier can be certain a task is hard and unsure which model suits it.
The router needs this one on its own, because whether a pick must clear
the upgrade bar or the downgrade bar depends on the pick, not the tier.

Absent means the strategy does not report one (the LLM classifier), in
which case the pick is honoured as it always was.

---

### contextScope?

> `optional` **contextScope?**: [`ClassifierContextScope`](ClassifierContextScope.md)

Defined in: [types/classifierRouter.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L90)

How much context the request needs. Only the decision strategy produces
this — the heuristic has no way to judge it and the LLM classifier is not
asked, since for it every extra field costs output tokens. For a decision
model the question is very nearly free.

---

### contextScopeConfidence?

> `optional` **contextScopeConfidence?**: `number`

Defined in: [types/classifierRouter.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L92)

Confidence in `contextScope`, 0-1. Calibrated for the decide strategy.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/classifierRouter.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L94)

Human-readable explanation, emitted at debug level.
