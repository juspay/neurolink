[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1432](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1432)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1433](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1433)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1434)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1435)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1436)
