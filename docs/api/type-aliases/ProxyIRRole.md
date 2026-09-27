[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRRole

# Type Alias: ProxyIRRole

> **ProxyIRRole** = `"system"` \| `"developer"` \| `"user"` \| `"assistant"`

Message roles across both dialects.

`developer` has no Anthropic equivalent and is native Codex's own role for
instruction blocks that sit inside the ordered input array rather than in a
leading system field. It is kept distinct from `system` so a codec targeting
Anthropic can decide where it belongs instead of inheriting a lossy merge.
