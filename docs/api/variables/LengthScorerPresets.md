[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LengthScorerPresets

# Variable: LengthScorerPresets

> `const` **LengthScorerPresets**: `object`

Defined in: [evaluation/scorers/rule/lengthScorer.ts:371](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/scorers/rule/lengthScorer.ts#L371)

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
