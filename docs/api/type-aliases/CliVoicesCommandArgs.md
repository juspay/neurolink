[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliVoicesCommandArgs

# Type Alias: CliVoicesCommandArgs

> **CliVoicesCommandArgs** = `object`

Defined in: [types/cli.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2111)

`neurolink voices` arguments — TTS voice discovery.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2113)

TTS provider whose voices to list (e.g. google-ai, openai-tts).

---

### language?

> `optional` **language?**: `string`

Defined in: [types/cli.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2115)

Optional language filter passed through to the provider (e.g. en-US).

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2117)

Emit the raw list as JSON instead of a table.
