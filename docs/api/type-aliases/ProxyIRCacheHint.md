[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRCacheHint

# Type Alias: ProxyIRCacheHint

> **ProxyIRCacheHint** = `object`

A request to cache the prefix up to and including the annotated element.

Only meaningful for Anthropic, whose caching is explicit and breakpoint-driven.
A codec targeting a dialect with automatic caching ignores it, which is correct
rather than lossy: nothing on that wire can carry it.

## Properties

### ttl?

> `optional` **ttl?**: `"5m"` \| `"1h"`
