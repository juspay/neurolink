[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerMetadata

# Type Alias: ScorerMetadata

> **ScorerMetadata** = `object`

Defined in: [types/scorer.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L141)

Scorer metadata for registration

## Properties

### id

> **id**: `string`

Defined in: [types/scorer.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L143)

Unique scorer identifier

---

### name

> **name**: `string`

Defined in: [types/scorer.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L145)

Human-readable name

---

### description

> **description**: `string`

Defined in: [types/scorer.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L147)

Description of what the scorer evaluates

---

### type

> **type**: [`ScorerType`](ScorerType.md)

Defined in: [types/scorer.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L149)

Scorer type (llm, rule, hybrid)

---

### category

> **category**: [`ScorerCategory`](ScorerCategory.md)

Defined in: [types/scorer.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L151)

Category for grouping

---

### version

> **version**: `string`

Defined in: [types/scorer.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L153)

Version string

---

### defaultConfig

> **defaultConfig**: [`ScorerConfig`](ScorerConfig.md)

Defined in: [types/scorer.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L155)

Default configuration

---

### requiredInputs

> **requiredInputs**: keyof [`ScorerInput`](ScorerInput.md)[]

Defined in: [types/scorer.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L157)

Required input fields

---

### optionalInputs

> **optionalInputs**: keyof [`ScorerInput`](ScorerInput.md)[]

Defined in: [types/scorer.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L159)

Optional input fields
