[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierDecision

# Type Alias: ClassifierDecision

> **ClassifierDecision** = `object`

Defined in: [types/classifierRouter.ts:34](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L34)

The classifier's verdict for a single request. Strategy-agnostic: produced
by both the heuristic and the LLM classifier.

## Properties

### difficulty

> **difficulty**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

Defined in: [types/classifierRouter.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L36)

The classified difficulty bucket.

---

### confidence

> **confidence**: `number`

Defined in: [types/classifierRouter.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L38)

Confidence in the classification (0–1).

---

### requiredCapabilities?

> `optional` **requiredCapabilities?**: `string`[]

Defined in: [types/classifierRouter.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L40)

Capability tags the request needs (e.g. "vision", "tools", "reasoning").

---

### suggestedTools?

> `optional` **suggestedTools?**: `string`[]

Defined in: [types/classifierRouter.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L42)

Tool names the classifier thinks the task needs (allowlist hint).

---

### selectedModelId?

> `optional` **selectedModelId?**: `string`

Defined in: [types/classifierRouter.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L47)

When the LLM classifier picks a model directly, the chosen candidate id
(matches a `ClassifierCandidate.id`). Ignored by the heuristic classifier.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/classifierRouter.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L49)

Human-readable explanation, emitted at debug level.
