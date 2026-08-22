[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1428](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1428)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1429](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1429)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1430](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1430)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1431](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1431)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1432](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1432)
