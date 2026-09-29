[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexOutboundFailureClass

# Type Alias: CodexOutboundFailureClass

> **CodexOutboundFailureClass** = `"no_accounts"` \| `"pool_exhausted"` \| `"non_retryable_transport"` \| `"loop_fallthrough"`

The four call sites in `codexProxyRoutes.ts`'s `dispatch()` that can trigger
an outbound fallback attempt (stage-c-trigger.md §0's corrected line map).
