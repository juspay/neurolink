[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerFunction

# Type Alias: ScorerFunction

> **ScorerFunction** = (`input`) => `Promise`\<\{ `score`: `number`; `reasoning`: `string`; `metadata?`: [`JsonObject`](JsonObject.md); \}\>

Defined in: [types/evaluation.ts:375](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L375)

Function scorer - a simple function-based scorer

## Parameters

### input

[`ScorerInput`](ScorerInput.md)

## Returns

`Promise`\<\{ `score`: `number`; `reasoning`: `string`; `metadata?`: [`JsonObject`](JsonObject.md); \}\>
