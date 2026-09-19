[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliVoicesCommandArgs

# Type Alias: CliVoicesCommandArgs

> **CliVoicesCommandArgs** = `object`

Defined in: [types/cli.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2049)

`neurolink voices` arguments — TTS voice discovery.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2051)

TTS provider whose voices to list (e.g. google-ai, openai-tts).

---

### language?

> `optional` **language?**: `string`

Defined in: [types/cli.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2053)

Optional language filter passed through to the provider (e.g. en-US).

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2055)

Emit the raw list as JSON instead of a table.
