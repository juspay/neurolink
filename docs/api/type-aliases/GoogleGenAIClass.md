[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleGenAIClass

# Type Alias: GoogleGenAIClass

> **GoogleGenAIClass** = (`cfg`) => [`GenAIClient`](GenAIClient.md)

Google GenAI constructor type
Supports both API key (Google AI Studio) and Vertex AI configurations

## Parameters

### cfg

\{ `apiKey`: `string`; `httpOptions?`: [`GoogleGenAIHttpOptions`](GoogleGenAIHttpOptions.md); \} \| \{ `vertexai`: `boolean`; `project`: `string`; `location`: `string`; `httpOptions?`: [`GoogleGenAIHttpOptions`](GoogleGenAIHttpOptions.md); \}

## Returns

[`GenAIClient`](GenAIClient.md)
