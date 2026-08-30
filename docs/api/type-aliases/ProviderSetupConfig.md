[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1474](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1474)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1475)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1476)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1477)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1478)
