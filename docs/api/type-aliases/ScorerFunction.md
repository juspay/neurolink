[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerFunction

# Type Alias: ScorerFunction

> **ScorerFunction** = (`input`) => `Promise`\<\{ `score`: `number`; `reasoning`: `string`; `metadata?`: [`JsonObject`](JsonObject.md); \}\>

Defined in: [types/evaluation.ts:380](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L380)

Function scorer - a simple function-based scorer

## Parameters

### input

[`ScorerInput`](ScorerInput.md)

## Returns

`Promise`\<\{ `score`: `number`; `reasoning`: `string`; `metadata?`: [`JsonObject`](JsonObject.md); \}\>
