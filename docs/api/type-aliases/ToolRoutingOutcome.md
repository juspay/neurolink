[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingOutcome

# Type Alias: ToolRoutingOutcome

> **ToolRoutingOutcome** = `"applied"` \| `"skipped-no-query"` \| `"skipped-single-server"` \| `"empty-pick"` \| `"failed-open-parse"` \| `"failed-open-timeout"` \| `"failed-open-error"` \| `"cache-hit"`

Defined in: [types/toolRouting.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L238)

Outcome classifier for a single routing resolution. Used in
`ToolRoutingDecision` and emitted as an OTel span attribute.
