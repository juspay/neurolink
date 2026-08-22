[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerFunction

# Type Alias: ScorerFunction

> **ScorerFunction** = (`input`) => `Promise`\<\{ `score`: `number`; `reasoning`: `string`; `metadata?`: [`JsonObject`](JsonObject.md); \}\>

Defined in: [types/evaluation.ts:375](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L375)

Function scorer - a simple function-based scorer

## Parameters

### input

[`ScorerInput`](ScorerInput.md)

## Returns

`Promise`\<\{ `score`: `number`; `reasoning`: `string`; `metadata?`: [`JsonObject`](JsonObject.md); \}\>
