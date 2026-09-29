[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexOutboundFallbackDecision

# Type Alias: CodexOutboundFallbackDecision

> **CodexOutboundFallbackDecision** = `object`

`classifyCodexOutboundFailure`'s verdict: whether this failure is eligible
to attempt an outbound fallback, and why (for tracing/logging only — the
caller still applies its own config/loop-prevention/depth gates).

## Properties

### eligible

> **eligible**: `boolean`

---

### reason

> **reason**: `string`
