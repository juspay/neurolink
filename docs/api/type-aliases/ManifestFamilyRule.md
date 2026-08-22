[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ManifestFamilyRule

# Type Alias: ManifestFamilyRule

> **ManifestFamilyRule** = `object`

Defined in: [types/model.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L332)

A regex-driven patch applied to an unlisted, gateway-shaped model id that
matches `pattern` (e.g. "vertex_ai/claude-sonnet-5@20260203"). Generalizes
the pattern VISION_FAMILY_RULES (src/lib/adapters/providerImageAdapter.ts)
and SAMPLING_PARAM_REJECTING_FAMILIES (src/lib/models/modelRegistry.ts)
already use independently, keyed per-provider instead of globally.

## Properties

### pattern

> **pattern**: `RegExp`

Defined in: [types/model.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L333)

---

### patch

> **patch**: `Partial`\<[`ProviderModelManifestEntry`](ProviderModelManifestEntry.md)\>

Defined in: [types/model.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L334)
