[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeCacheControl

# Type Alias: ClaudeCacheControl

> **ClaudeCacheControl** = `object`

Anthropic prompt-cache breakpoint marker.

Anthropic caching is explicit: the prefix up to each marker is cached, and a
request carrying none is cached not at all. Four markers is the hard ceiling.

## Properties

### type

> **type**: `"ephemeral"`

---

### ttl?

> `optional` **ttl?**: `"5m"` \| `"1h"`

How long the marked prefix stays cached. The API accepts a 5-minute or a
1-hour window, priced at 1.25x and 2x base input respectively; omitting it
means 5 minutes. Without this field a caller cannot express the 1-hour
marker at all.
