[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierDecision

# Type Alias: ClassifierDecision

> **ClassifierDecision** = `object`

The classifier's verdict for a single request. Strategy-agnostic: produced
by both the heuristic and the LLM classifier.

## Properties

### difficulty

> **difficulty**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

The classified difficulty bucket.

---

### confidence

> **confidence**: `number`

Confidence in the classification (0–1).

---

### requiredCapabilities?

> `optional` **requiredCapabilities?**: `string`[]

Capability tags the request needs (e.g. "vision", "tools", "reasoning").

---

### suggestedTools?

> `optional` **suggestedTools?**: `string`[]

Tool names the classifier thinks the task needs (allowlist hint).

---

### selectedModelId?

> `optional` **selectedModelId?**: `string`

When the LLM classifier picks a model directly, the chosen candidate id
(matches a `ClassifierCandidate.id`). Ignored by the heuristic classifier.

---

### selectedModelConfidence?

> `optional` **selectedModelConfidence?**: `number`

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

How much context the request needs. Only the decision strategy produces
this — the heuristic has no way to judge it and the LLM classifier is not
asked, since for it every extra field costs output tokens. For a decision
model the question is very nearly free.

---

### contextScopeConfidence?

> `optional` **contextScopeConfidence?**: `number`

Confidence in `contextScope`, 0-1. Calibrated for the decide strategy.

---

### reason?

> `optional` **reason?**: `string`

Human-readable explanation, emitted at debug level.
