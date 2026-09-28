[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TYPESAFE_MAX_STATE_TOKENS

# Variable: TYPESAFE_MAX_STATE_TOKENS

> `const` **TYPESAFE_MAX_STATE_TOKENS**: `33000` = `33_000`

The binding limit in practice: `state` plus the SINGLE LONGEST question.
Measured by bisection at single-character resolution — 33,002 reported
input tokens accepted, 33,003 not.

The same figure sits on the TypeSafe descriptor as an ADVISORY
`decisionLimits.maxStateTokens`, which is what `NeuroLink.decisionLimits()`
reads; the server enforces it, NeuroLink only reports it. The descriptor
cannot import this constant without a cycle, so the decide suite pins them
equal instead.
