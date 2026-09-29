[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackTarget

# Type Alias: CodexFallbackTarget

> **CodexFallbackTarget** = `object`

One outbound-fallback hop for a native Codex request whose own account pool
is exhausted. No `reasoningEffort` (unlike FallbackEntry): that knob configures
a Codex _inbound_ leg and has no meaning once the request has left Codex's
Responses format and become an Anthropic Messages request.

## Properties

### provider

> **provider**: `"anthropic"` \| `"vertex"`

---

### model

> **model**: `string`
