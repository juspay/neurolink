[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ManifestFamilyRule

# Type Alias: ManifestFamilyRule

> **ManifestFamilyRule** = `object`

A regex-driven patch applied to an unlisted, gateway-shaped model id that
matches `pattern` (e.g. "vertex_ai/claude-sonnet-5@20260203"). Generalizes
the pattern VISION_FAMILY_RULES (src/lib/adapters/providerImageAdapter.ts)
and SAMPLING_PARAM_REJECTING_FAMILIES (src/lib/models/modelRegistry.ts)
already use independently, keyed per-provider instead of globally.

## Properties

### pattern

> **pattern**: `RegExp`

---

### patch

> **patch**: `Partial`\<[`ProviderModelManifestEntry`](ProviderModelManifestEntry.md)\>
