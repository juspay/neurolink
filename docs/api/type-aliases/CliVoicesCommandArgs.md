[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliVoicesCommandArgs

# Type Alias: CliVoicesCommandArgs

> **CliVoicesCommandArgs** = `object`

`neurolink voices` arguments — TTS voice discovery.

## Properties

### provider

> **provider**: `string`

TTS provider whose voices to list (e.g. google-ai, openai-tts).

---

### language?

> `optional` **language?**: `string`

Optional language filter passed through to the provider (e.g. en-US).

---

### json?

> `optional` **json?**: `boolean`

Emit the raw list as JSON instead of a table.
