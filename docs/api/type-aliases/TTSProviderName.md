[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProviderName

# Type Alias: TTSProviderName

> **TTSProviderName** = `"google-ai"` \| `"vertex"` \| `"openai-tts"` \| `"elevenlabs"` \| `"elevenlabs-tts"` \| `"azure-tts"` \| `"fish-audio"` \| `"cartesia"` \| `string` & `object`

Defined in: [types/tts.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L41)

Known TTS provider identifiers shipped with NeuroLink.

The `(string & {})` intersection keeps the union open for custom
provider names registered via `TTSProcessor.registerHandler()` while
still surfacing the built-in choices in editor autocomplete.
