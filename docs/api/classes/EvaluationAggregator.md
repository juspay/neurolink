[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationAggregator

# Class: EvaluationAggregator

Defined in: [evaluation/EvaluationAggregator.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L39)

EvaluationAggregator - Aggregates evaluation results and provides analytics.
Supports statistical analysis, trend detection, and quality monitoring.

## Example

```typescript
const aggregator = new EvaluationAggregator();

// Add evaluations
aggregator.addEvaluation(evaluation1);
aggregator.addEvaluation(evaluation2);

// Get aggregation
const result = aggregator.aggregate({ threshold: 7 });
console.log(`Average score: ${result.statistics.mean}`);
console.log(`Passing rate: ${result.passingRate}%`);

// Get trend analysis
const trend = aggregator.analyzeSequenceTrend();
console.log(`Quality is ${trend.direction}`);
```

## Constructors

### Constructor

> **new EvaluationAggregator**(): `EvaluationAggregator`

#### Returns

`EvaluationAggregator`

## Methods

### addEvaluation()

> **addEvaluation**(`evaluation`): `void`

Defined in: [evaluation/EvaluationAggregator.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L47)

Adds an evaluation to the aggregator.

#### Parameters

##### evaluation

[`EvaluationData`](../type-aliases/EvaluationData.md)

The evaluation data to add

#### Returns

`void`

---

### addEvaluations()

> **addEvaluations**(`evaluations`): `void`

Defined in: [evaluation/EvaluationAggregator.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L56)

Adds multiple evaluations to the aggregator.

#### Parameters

##### evaluations

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of evaluation data to add

#### Returns

`void`

---

### clear()

> **clear**(): `void`

Defined in: [evaluation/EvaluationAggregator.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L63)

Clears all evaluations from the aggregator.

#### Returns

`void`

---

### getCount()

> **getCount**(): `number`

Defined in: [evaluation/EvaluationAggregator.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L70)

Gets the current number of evaluations.

#### Returns

`number`

---

### getEvaluations()

> **getEvaluations**(): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Defined in: [evaluation/EvaluationAggregator.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L77)

Gets all evaluations.

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

---

### aggregate()

> **aggregate**(`options?`): [`AggregationResult`](../type-aliases/AggregationResult.md)

Defined in: [evaluation/EvaluationAggregator.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L87)

Aggregates all evaluations and returns comprehensive statistics.

#### Parameters

##### options?

Aggregation options

###### threshold?

`number`

#### Returns

[`AggregationResult`](../type-aliases/AggregationResult.md)

Comprehensive aggregation result

---

### calculateStatistics()

> **calculateStatistics**(`scores`): [`ScoreStatistics`](../type-aliases/ScoreStatistics.md)

Defined in: [evaluation/EvaluationAggregator.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L147)

Calculates statistical summary for a set of scores.

#### Parameters

##### scores

`number`[]

Array of scores

#### Returns

[`ScoreStatistics`](../type-aliases/ScoreStatistics.md)

Statistical summary

---

### calculateDistribution()

> **calculateDistribution**(`scores`): [`ScoreDistribution`](../type-aliases/ScoreDistribution.md)

Defined in: [evaluation/EvaluationAggregator.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L193)

Calculates the distribution of scores across quality ranges.

#### Parameters

##### scores

`number`[]

Array of scores

#### Returns

[`ScoreDistribution`](../type-aliases/ScoreDistribution.md)

Score distribution

---

### analyzeSequenceTrend()

> **analyzeSequenceTrend**(`windowSize?`): [`TrendAnalysis`](../type-aliases/TrendAnalysis.md)

Defined in: [evaluation/EvaluationAggregator.ts:209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L209)

Analyzes sequence-based trends in evaluation scores (based on insertion order, not time).

#### Parameters

##### windowSize?

`number` = `5`

Moving average window size (default: 5)

#### Returns

[`TrendAnalysis`](../type-aliases/TrendAnalysis.md)

Trend analysis

---

### getFailingEvaluations()

> **getFailingEvaluations**(`threshold?`): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Defined in: [evaluation/EvaluationAggregator.ts:384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L384)

Gets evaluations that failed to meet the threshold.

#### Parameters

##### threshold?

`number` = `7`

The passing threshold

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of failing evaluations

---

### getHighAlertEvaluations()

> **getHighAlertEvaluations**(): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Defined in: [evaluation/EvaluationAggregator.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L393)

Gets evaluations with high severity alerts.

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of high-alert evaluations

---

### getOffTopicEvaluations()

> **getOffTopicEvaluations**(): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Defined in: [evaluation/EvaluationAggregator.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L402)

Gets evaluations marked as off-topic.

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of off-topic evaluations

---

### getTopEvaluations()

> **getTopEvaluations**(`n?`): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Defined in: [evaluation/EvaluationAggregator.ts:412](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L412)

Gets the top N performing evaluations.

#### Parameters

##### n?

`number` = `5`

Number of evaluations to return

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of top evaluations

---

### getBottomEvaluations()

> **getBottomEvaluations**(`n?`): [`EvaluationData`](../type-aliases/EvaluationData.md)[]

Defined in: [evaluation/EvaluationAggregator.ts:424](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L424)

Gets the bottom N performing evaluations.

#### Parameters

##### n?

`number` = `5`

Number of evaluations to return

#### Returns

[`EvaluationData`](../type-aliases/EvaluationData.md)[]

Array of bottom evaluations

---

### generateSummary()

> **generateSummary**(`threshold?`): `string`

Defined in: [evaluation/EvaluationAggregator.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluationAggregator.ts#L436)

Generates a text summary of the aggregation.

#### Parameters

##### threshold?

`number` = `7`

The passing threshold

#### Returns

`string`

Human-readable summary
