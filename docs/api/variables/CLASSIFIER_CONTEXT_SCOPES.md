[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CLASSIFIER_CONTEXT_SCOPES

# Variable: CLASSIFIER_CONTEXT_SCOPES

> `const` **CLASSIFIER_CONTEXT_SCOPES**: [`ClassifierContextScope`](../type-aliases/ClassifierContextScope.md)[]

Defined in: [routing/classifierStrategies.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierStrategies.ts#L249)

How much context the request needs, narrowest → widest. Ordered, because a
decision model places things on a scale reliably and names numbers badly:
asking "how many tokens" would get digits read as text, while asking "which
of these four descriptions fits" gets a calibrated position.
