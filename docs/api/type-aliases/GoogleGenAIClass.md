[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleGenAIClass

# Type Alias: GoogleGenAIClass

> **GoogleGenAIClass** = (`cfg`) => [`GenAIClient`](GenAIClient.md)

Defined in: [types/providers.ts:925](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L925)

Google GenAI constructor type
Supports both API key (Google AI Studio) and Vertex AI configurations

## Parameters

### cfg

\{ `apiKey`: `string`; \} \| \{ `vertexai`: `boolean`; `project`: `string`; `location`: `string`; \}

## Returns

[`GenAIClient`](GenAIClient.md)
