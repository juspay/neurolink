[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleGenAIClass

# Type Alias: GoogleGenAIClass

> **GoogleGenAIClass** = (`cfg`) => [`GenAIClient`](GenAIClient.md)

Defined in: [types/providers.ts:1241](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1241)

Google GenAI constructor type
Supports both API key (Google AI Studio) and Vertex AI configurations

## Parameters

### cfg

\{ `apiKey`: `string`; `httpOptions?`: [`GoogleGenAIHttpOptions`](GoogleGenAIHttpOptions.md); \} \| \{ `vertexai`: `boolean`; `project`: `string`; `location`: `string`; `httpOptions?`: [`GoogleGenAIHttpOptions`](GoogleGenAIHttpOptions.md); \}

## Returns

[`GenAIClient`](GenAIClient.md)
