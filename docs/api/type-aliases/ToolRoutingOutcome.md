[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingOutcome

# Type Alias: ToolRoutingOutcome

> **ToolRoutingOutcome** = `"applied"` \| `"skipped-no-query"` \| `"skipped-single-server"` \| `"empty-pick"` \| `"failed-open-parse"` \| `"failed-open-timeout"` \| `"failed-open-error"` \| `"cache-hit"`

Defined in: [types/toolRouting.ts:226](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L226)

Outcome classifier for a single routing resolution. Used in
`ToolRoutingDecision` and emitted as an OTel span attribute.
