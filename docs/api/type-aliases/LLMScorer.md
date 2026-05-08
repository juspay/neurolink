[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LLMScorer

# Type Alias: LLMScorer

> **LLMScorer** = [`Scorer`](Scorer.md) & `object`

Defined in: [types/scorer.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L291)

Extended interface for LLM-based scorers

## Type Declaration

### llmConfig

> `readonly` **llmConfig**: [`LLMScorerConfig`](LLMScorerConfig.md)

LLM-specific configuration

### generatePrompt()

> **generatePrompt**(`input`): `string`

Generate the prompt for LLM scoring

#### Parameters

##### input

[`ScorerInput`](ScorerInput.md)

Scorer input

#### Returns

`string`

Prompt string

### parseResponse()

> **parseResponse**(`response`, `input`): `Partial`\<[`ScoreResult`](ScoreResult.md)\>

Parse LLM response into score result

#### Parameters

##### response

`string`

Raw LLM response

##### input

[`ScorerInput`](ScorerInput.md)

Original input

#### Returns

`Partial`\<[`ScoreResult`](ScoreResult.md)\>

Parsed score result
