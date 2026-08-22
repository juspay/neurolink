[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DimensionAnalysis

# Type Alias: DimensionAnalysis

> **DimensionAnalysis** = `object`

Defined in: [types/evaluation.ts:505](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L505)

Dimension-specific analysis for RAGAS metrics.

## Properties

### relevance

> **relevance**: [`ScoreStatistics`](ScoreStatistics.md)

Defined in: [types/evaluation.ts:506](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L506)

---

### accuracy

> **accuracy**: [`ScoreStatistics`](ScoreStatistics.md)

Defined in: [types/evaluation.ts:507](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L507)

---

### completeness

> **completeness**: [`ScoreStatistics`](ScoreStatistics.md)

Defined in: [types/evaluation.ts:508](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L508)

---

### overall

> **overall**: [`ScoreStatistics`](ScoreStatistics.md)

Defined in: [types/evaluation.ts:509](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L509)

---

### correlations

> **correlations**: `object`

Defined in: [types/evaluation.ts:510](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L510)

#### relevanceAccuracy

> **relevanceAccuracy**: `number`

#### relevanceCompleteness

> **relevanceCompleteness**: `number`

#### accuracyCompleteness

> **accuracyCompleteness**: `number`
