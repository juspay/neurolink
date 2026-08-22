[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleGenAIClass

# Type Alias: GoogleGenAIClass

> **GoogleGenAIClass** = (`cfg`) => [`GenAIClient`](GenAIClient.md)

Defined in: [types/providers.ts:1212](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1212)

Google GenAI constructor type
Supports both API key (Google AI Studio) and Vertex AI configurations

## Parameters

### cfg

\{ `apiKey`: `string`; `httpOptions?`: [`GoogleGenAIHttpOptions`](GoogleGenAIHttpOptions.md); \} \| \{ `vertexai`: `boolean`; `project`: `string`; `location`: `string`; `httpOptions?`: [`GoogleGenAIHttpOptions`](GoogleGenAIHttpOptions.md); \}

## Returns

[`GenAIClient`](GenAIClient.md)
