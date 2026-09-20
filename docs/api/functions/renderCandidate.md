[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / renderCandidate

# Function: renderCandidate()

> **renderCandidate**(`candidate`): `string`

Defined in: [routing/modelCatalog.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/routing/modelCatalog.ts#L372)

Render one candidate as a single criteria line for the decision model.

Terse on purpose: this text is multiplied by the candidate count inside a
single question, and that question competes with the request for the
~33K ceiling. Numbers are rendered in units a reader can compare at a
glance (K tokens, ¢ per 1K) because a decision model reads digits as text
and does better with "128K" than with "131072".

## Parameters

### candidate

[`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)

## Returns

`string`
