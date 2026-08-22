[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FormatScorerPresets

# Variable: FormatScorerPresets

> `const` **FormatScorerPresets**: `object`

Defined in: [evaluation/scorers/rule/formatScorer.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/scorers/rule/formatScorer.ts#L551)

Pre-configured format scorer presets

## Type Declaration

### json

> `readonly` **json**: () => `FormatScorer`

JSON format

#### Returns

`FormatScorer`

### markdown

> `readonly` **markdown**: () => `FormatScorer`

Markdown format

#### Returns

`FormatScorer`

### markdownWithHeadings

> `readonly` **markdownWithHeadings**: () => `FormatScorer`

Markdown with headings required

#### Returns

`FormatScorer`

### bulletList

> `readonly` **bulletList**: () => `FormatScorer`

Bullet list format

#### Returns

`FormatScorer`

### numberedList

> `readonly` **numberedList**: () => `FormatScorer`

Numbered list format

#### Returns

`FormatScorer`

### code

> `readonly` **code**: () => `FormatScorer`

Code response

#### Returns

`FormatScorer`

### plainText

> `readonly` **plainText**: () => `FormatScorer`

Plain text only

#### Returns

`FormatScorer`
