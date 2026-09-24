[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TYPESAFE_MAX_STATE_TOKENS

# Variable: TYPESAFE_MAX_STATE_TOKENS

> `const` **TYPESAFE_MAX_STATE_TOKENS**: `33000` = `33_000`

Defined in: [providers/typesafe.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/providers/typesafe.ts#L53)

The binding limit in practice: `state` plus the SINGLE LONGEST question.
Measured by bisection at single-character resolution — 33,002 reported
input tokens accepted, 33,003 not.
