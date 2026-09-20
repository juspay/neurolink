[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionCallerFn

# Type Alias: DecisionCallerFn

> **DecisionCallerFn** = (`options`) => `Promise`\<[`DecisionResult`](DecisionResult.md) \| `null`\>

Defined in: [types/decision.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L223)

Injected fail-open decision caller — typically a bound `NeuroLink.tryDecide`,
which returns `null` on any failure rather than throwing.

Every internal consumer of the `decide` inference type takes one of these
instead of importing a provider, exactly as the tool router takes a
`generateFn`. It is what keeps the consumers provider-import-free, and what
makes "no decision provider configured" indistinguishable from "the call
failed" at every call site: both are `null`, and both mean _carry on as
before_.

## Parameters

### options

[`DecisionOptions`](DecisionOptions.md)

## Returns

`Promise`\<[`DecisionResult`](DecisionResult.md) \| `null`\>
