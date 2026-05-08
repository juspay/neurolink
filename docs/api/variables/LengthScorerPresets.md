[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LengthScorerPresets

# Variable: LengthScorerPresets

> `const` **LengthScorerPresets**: `object`

Defined in: [evaluation/scorers/rule/lengthScorer.ts:372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/lengthScorer.ts#L372)

Pre-configured length scorer presets

## Type Declaration

### short

> `readonly` **short**: () => `LengthScorer`

Short response (50-150 words)

#### Returns

`LengthScorer`

### medium

> `readonly` **medium**: () => `LengthScorer`

Medium response (100-300 words)

#### Returns

`LengthScorer`

### long

> `readonly` **long**: () => `LengthScorer`

Long response (200-500 words)

#### Returns

`LengthScorer`

### concise

> `readonly` **concise**: () => `LengthScorer`

Concise response (max 100 words)

#### Returns

`LengthScorer`

### detailed

> `readonly` **detailed**: () => `LengthScorer`

Detailed response (min 300 words)

#### Returns

`LengthScorer`

### tweet

> `readonly` **tweet**: () => `LengthScorer`

Tweet-length (max 280 characters)

#### Returns

`LengthScorer`
