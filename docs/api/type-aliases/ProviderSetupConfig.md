[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1518](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1518)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1519](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1519)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1520](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1520)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1521](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1521)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1522)
