[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierContextScope

# Type Alias: ClassifierContextScope

> **ClassifierContextScope** = `"current-message"` \| `"recent-turns"` \| `"full-conversation"` \| `"everything"`

Defined in: [types/classifierRouter.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L50)

How much of the available context a request actually needs, ordered
narrowest → widest. This is a _rubric_, not a token count: a decision model
is reliable at placing a request on an ordered scale and unreliable at
naming a number (it reads digits as text, not as quantities).

The index is mapped onto a compaction threshold by the router, and only
ever downward — see `ClassifierRouterDecision.compactionThreshold`.
