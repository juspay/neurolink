[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionErrorKind

# Type Alias: DecisionErrorKind

> **DecisionErrorKind** = `"authentication"` \| `"invalid_request"` \| `"max_tokens_exceeded"` \| `"rate_limit"` \| `"overloaded"` \| `"server"` \| `"timeout"` \| `"network"`

Defined in: [types/decision.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L179)

Why a decision call failed, normalised across vendors. TypeSafe alone
returns two different error envelopes, so a provider must flatten them.
