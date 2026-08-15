[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProviderName

# Type Alias: TTSProviderName

> **TTSProviderName** = `"google-ai"` \| `"vertex"` \| `"openai-tts"` \| `"elevenlabs"` \| `"elevenlabs-tts"` \| `"azure-tts"` \| `"fish-audio"` \| `"cartesia"` \| `string` & `object`

Defined in: [types/tts.ts:41](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L41)

Known TTS provider identifiers shipped with NeuroLink.

The `(string & {})` intersection keeps the union open for custom
provider names registered via `TTSProcessor.registerHandler()` while
still surfacing the built-in choices in editor autocomplete.
