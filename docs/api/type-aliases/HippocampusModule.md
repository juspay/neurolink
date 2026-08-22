[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusModule

# Type Alias: HippocampusModule

> **HippocampusModule** = `object`

Defined in: [types/memory.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/types/memory.ts#L110)

Shape of the dynamically-required `@juspay/hippocampus` module surface
that NeuroLink's lazy initializer reaches for. Only the constructor is
surfaced here; the rest of the module is irrelevant to core.

## Properties

### Hippocampus

> **Hippocampus**: (`config?`) => [`HippocampusLike`](HippocampusLike.md)

Defined in: [types/memory.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/memory.ts#L111)

#### Parameters

##### config?

[`HippocampusConfig`](HippocampusConfig.md)

#### Returns

[`HippocampusLike`](HippocampusLike.md)
