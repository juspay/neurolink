[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TYPESAFE_MAX_REQUEST_TOKENS

# Variable: TYPESAFE_MAX_REQUEST_TOKENS

> `const` **TYPESAFE_MAX_REQUEST_TOKENS**: `64000` = `64_000`

Defined in: [providers/typesafe.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/providers/typesafe.ts#L61)

The separate, larger ceiling on `state` plus ALL questions combined. A
request can carry a near-ceiling state _and_ 400 extra questions (37,679
tokens total, verified) — questions do not compete with state for the
33K budget, only for this one.
