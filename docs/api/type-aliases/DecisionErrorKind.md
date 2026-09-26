[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionErrorKind

# Type Alias: DecisionErrorKind

> **DecisionErrorKind** = `"authentication"` \| `"invalid_request"` \| `"max_tokens_exceeded"` \| `"rate_limit"` \| `"overloaded"` \| `"server"` \| `"timeout"` \| `"network"`

Why a decision call failed, normalised across vendors. TypeSafe alone
returns two different error envelopes, so a provider must flatten them.
