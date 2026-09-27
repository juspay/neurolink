[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRWireFormat

# Type Alias: ProxyIRWireFormat

> **ProxyIRWireFormat** = `"anthropic-messages"` \| `"codex-responses"`

A wire dialect a codec can speak.

Distinct from `ProxyFormat` ("claude" | "openai" | "gemini"), which selects a
request-translation surface for a different subsystem. These must not be
conflated: this one names the two dialects the fallback codecs translate.
